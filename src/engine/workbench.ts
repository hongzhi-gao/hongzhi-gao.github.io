type Tab = { id: string; label: string; scenarios: string[] };

customElements.define(
  "project-workbench",
  class extends HTMLElement {
    private lifecycle?: AbortController;

    disconnectedCallback() {
      this.lifecycle?.abort();
    }

    connectedCallback() {
      this.lifecycle?.abort();
      this.lifecycle = new AbortController();
      const signal = this.lifecycle.signal;
      const tabs: Tab[] = JSON.parse(
        this.querySelector("[data-workbench-config]")!.textContent!,
      );
      const buttons = Array.from(
        this.querySelectorAll<HTMLButtonElement>("[data-module]"),
      );
      const picker = this.querySelector<HTMLSelectElement>(
        "[data-scenario-picker]",
      )!;
      const panel = this.querySelector<HTMLElement>("[data-workbench-panel]")!;
      const presets = new Map(
        Array.from(
          this.querySelectorAll<HTMLTemplateElement>("template[data-scene]"),
        ).map((template) => [template.dataset.scene!, template]),
      );
      const prefix = `#${this.dataset.project}:`;
      let active = tabs[0].scenarios[0];

      const show = (id: string, updateUrl: boolean) => {
        const tabIndex = tabs.findIndex((tab) => tab.scenarios.includes(id));
        if (tabIndex < 0 || id === active) return;
        const previous = active;
        active = id;
        const selected = buttons[tabIndex];
        for (const button of buttons) {
          button.tabIndex = button === selected ? 0 : -1;
          button.setAttribute("aria-selected", String(button === selected));
        }
        panel.setAttribute("aria-labelledby", selected.id);
        const variants = tabs[tabIndex].scenarios;
        picker.parentElement!.hidden = variants.length < 2;
        picker.replaceChildren(
          ...variants.map(
            (value) =>
              new Option(
                presets.get(value)!.dataset.title,
                value,
                false,
                value === id,
              ),
          ),
        );
        const content = presets.get(id)!.content.cloneNode(true);
        panel.replaceChildren(content);
        if (updateUrl && previous !== id)
          history.replaceState(history.state, "", prefix + id);
      };

      const selectHash = () => {
        if (!location.hash.startsWith(prefix)) return;
        show(location.hash.slice(prefix.length), false);
        this.closest("section")?.scrollIntoView();
      };
      for (const [index, button] of buttons.entries()) {
        button.addEventListener(
          "click",
          () => show(tabs[index].scenarios[0], true),
          { signal },
        );
        button.addEventListener(
          "keydown",
          (event) => {
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? tabs.length - 1
                  : event.key === "ArrowRight"
                    ? (index + 1) % tabs.length
                    : event.key === "ArrowLeft"
                      ? (index - 1 + tabs.length) % tabs.length
                      : undefined;
            if (next === undefined) return;
            event.preventDefault();
            show(tabs[next].scenarios[0], true);
            buttons[next].focus();
          },
          { signal },
        );
      }
      picker.addEventListener("change", () => show(picker.value, true), {
        signal,
      });
      panel.addEventListener(
        "click",
        (event) => {
          const link = (event.target as Element).closest<HTMLAnchorElement>(
            "a[href^='#']",
          );
          const destination = link?.getAttribute("href");
          if (!destination?.startsWith(prefix)) return;
          event.preventDefault();
          show(destination.slice(prefix.length), true);
          buttons
            .find((button) => button.tabIndex === 0)
            ?.focus({ preventScroll: true });
        },
        { signal },
      );
      window.addEventListener("hashchange", selectHash, { signal });
      selectHash();
    }
  },
);
