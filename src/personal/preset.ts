import type { AppState } from "../shared/types";
import { parseState } from "../storage/schema";
declare const __PERSONAL_PRESET__: boolean;
export const personalPresetEnabled = __PERSONAL_PRESET__;
export function renderPersonalPreset(): string {
  return personalPresetEnabled
    ? '<section class="section section-heading"><div><h2>Cadastro pessoal</h2><p>Disponível somente nesta versão local.</p></div><div><p>Carregue seus dados fornecidos, formações, experiências, perfis e respostas. Preferências e campos ensinados são mantidos.</p><button type="button" id="load-personal-preset" class="secondary">Carregar meu cadastro</button></div></section>'
    : "";
}
function mergeById<T extends { id: string }>(current: T[], personal: T[]): T[] {
  const ids = new Set(personal.map((item) => item.id));
  return [...personal, ...current.filter((item) => !ids.has(item.id))];
}
export function bindPersonalPreset(
  state: AppState,
  save: (next: AppState) => Promise<void>,
  notify: (text: string) => void,
) {
  if (!personalPresetEnabled) return;
  const button = document.getElementById(
    "load-personal-preset",
  ) as HTMLButtonElement | null;
  if (!button) return;
  button.onclick = async () => {
    const existing =
      Object.keys(state.candidate).length ||
      state.education.length ||
      state.experiences.length ||
      state.profiles.length ||
      state.rules.length;
    const dirty =
      document.querySelector("form")?.getAttribute("data-dirty") === "true";
    if (
      (existing || dirty) &&
      !confirm(
        "Carregar seu cadastro pessoal salvo? Dados correspondentes e registros pessoais serão atualizados; edições não salvas serão descartadas. Preferências, associações e outros registros serão mantidos.",
      )
    )
      return;
    button.disabled = true;
    notify("Carregando cadastro pessoal local…");
    try {
      const response = await fetch(
        new URL("personal-preset.local.json", window.location.href),
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(
          "Arquivo pessoal indisponível. Gere a versão pessoal da extensão.",
        );
      const preset = parseState(await response.json());
      const next = structuredClone(state);
      next.candidate = { ...next.candidate, ...preset.candidate };
      next.education = mergeById(next.education, preset.education);
      next.experiences = mergeById(next.experiences, preset.experiences);
      next.profiles = mergeById(next.profiles, preset.profiles);
      next.rules = mergeById(next.rules, preset.rules);
      await save(parseState(next));
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o cadastro pessoal.",
      );
    } finally {
      button.disabled = false;
    }
  };
}
