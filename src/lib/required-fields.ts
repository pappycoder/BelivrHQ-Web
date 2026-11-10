/** Returns empty required controls without treating zero as an empty answer. */
export function missingRequiredControls(form: HTMLFormElement): HTMLElement[] {
  return Array.from(form.querySelectorAll<HTMLElement>('[required],[aria-required="true"],[data-required="true"]')).filter((control) => {
    if (control.matches(':disabled,[aria-disabled="true"]')) return false;
    if (control instanceof HTMLInputElement) {
      if (control.type === "checkbox" || control.type === "radio") return control.validity.valueMissing;
      if (control.type === "password" || /password/.test(control.autocomplete)) return !control.value;
      return !control.value.trim();
    }
    if (control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) return !control.value.trim();
    if (control.matches('[data-slot="select-trigger"]')) return control.hasAttribute("data-placeholder");
    if (control.getAttribute("role") === "group") return !control.querySelector('[data-state="checked"],input:checked');
    return false;
  });
}
