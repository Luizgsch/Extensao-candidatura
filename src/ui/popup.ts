import { loadState, preview } from "./storage";
const status = document.querySelector<HTMLElement>("#status")!;
const select = document.querySelector<HTMLSelectElement>("#profile")!;
void loadState()
  .then(async (state) => {
    if (state.profiles.length) {
      select.replaceChildren(
        ...state.profiles.map(
          (profile) => new Option(profile.name, profile.id),
        ),
      );
    }
    if (!preview) {
      const saved = await chrome.storage.local.get("selectedProfileId");
      if (state.profiles.some((p) => p.id === saved.selectedProfileId))
        select.value = String(saved.selectedProfileId);
    }
  })
  .catch(() => {
    status.textContent =
      "Não foi possível carregar os perfis. Reabra a extensão.";
  });
select.addEventListener("change", () => {
  if (!preview)
    void chrome.storage.local
      .set({ selectedProfileId: select.value })
      .catch(() => {
        status.textContent = "Não foi possível salvar o perfil.";
      });
});
document.querySelector("#settings")!.addEventListener("click", () => {
  if (preview) window.location.href = "settings.html";
  else
    void chrome.runtime.openOptionsPage().catch(() => {
      status.textContent = "Não foi possível abrir as configurações.";
    });
});
