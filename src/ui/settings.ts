import { renderMappings, bindMappings } from "./mappings";
import { editAnswer } from "../storage/answers";
import type { AppState, AnswerValue, LocalizedText } from "../shared/types";
import { loadState, saveState, clearAllData, preview } from "./storage";
import { createDefaultState } from "../defaults/state";
import {
  exportBackup,
  importBackup,
  MAX_IMPORT_BYTES,
} from "../storage/import-export";
let state: AppState;
let page = "dados";
let busy = false;
const pages: Record<string, string> = {
  dados: "Meus dados",
  experiencias: "Experiências",
  respostas: "Minhas respostas",
  ensinados: "Campos ensinados",
  perfis: "Perfis",
  preferencias: "Preferências",
  privacidade: "Privacidade",
};
const descriptions: Record<string, string> = {
  dados: "Organize uma vez. Leve suas informações para cada oportunidade.",
  experiencias: "Sua trajetória, com espaço para contar os detalhes.",
  respostas: "Guarde respostas recorrentes, sem repetir o trabalho.",
  ensinados: "Ensine uma vez. Gerencie as associações de cada site.",
  perfis: "Uma preparação diferente para cada tipo de oportunidade.",
  preferencias: "Defina quando uma correspondência merece sua confiança.",
  privacidade: "Seus dados ficam neste navegador. Você mantém o controle.",
};
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const field = (
  name: string,
  label: string,
  value = "",
  type = "text",
  wide = false,
) =>
  '<div class="' +
  (wide ? "wide" : "") +
  '"><label for="' +
  name +
  '">' +
  label +
  '</label><input id="' +
  name +
  '" name="' +
  name +
  '" type="' +
  type +
  (type === "number" ? '" step="any" value="' : '" value="') +
  escape(value) +
  '"></div>';
const area = (name: string, label: string, value = "") =>
  '<div class="wide"><label for="' +
  name +
  '">' +
  label +
  '</label><textarea id="' +
  name +
  '" name="' +
  name +
  '">' +
  escape(value) +
  "</textarea></div>";
const personal = [
  ["fullName", "Nome completo"],
  ["firstName", "Primeiro nome"],
  ["lastName", "Sobrenome"],
  ["email", "E-mail", "email"],
  ["phone", "Telefone", "tel"],
  ["birthDate", "Data de nascimento", "date"],
  ["cpf", "CPF"],
  ["rg", "RG"],
  ["issuer", "Órgão expedidor"],
  ["mother", "Nome da mãe"],
  ["father", "Nome do pai"],
];
const contact = [
  ["postalCode", "CEP"],
  ["address", "Endereço"],
  ["complement", "Complemento"],
  ["city", "Cidade"],
  ["state", "Estado"],
  ["country", "País"],
  ["linkedin", "LinkedIn", "url"],
  ["github", "GitHub", "url"],
  ["portfolio", "Portfólio", "url"],
];
const professional = [
  ["desiredRole", "Cargo desejado"],
  ["professionalArea", "Área profissional"],
  ["javaYears", "Anos de experiência com Java", "number"],
  ["sqlYears", "Anos de experiência com SQL", "number"],
  ["salaryExpectation", "Pretensão salarial mensal (BRL)", "salary"],
  ["lastSalary", "Última remuneração mensal (BRL)", "salary"],
  ["relocation", "Disponibilidade para mudança", "boolean"],
  ["onsite", "Disponibilidade presencial", "boolean"],
  ["hybrid", "Disponibilidade híbrida", "boolean"],
  ["remote", "Disponibilidade remota", "boolean"],
  ["englishLevel", "Nível de inglês"],
  ["technicalReading", "Leitura técnica em inglês", "boolean"],
  ["technologies", "Tecnologias"],
  ["aws", "Experiência com AWS", "boolean"],
  ["preferredLocation", "Localidade preferida"],
  ["startAvailability", "Disponibilidade para início"],
  ["workAuthorization", "Autorização para trabalhar no Brasil", "boolean"],
  ["referral", "Indicação", "boolean"],
  ["knowsEmployee", "Conhece alguém na empresa", "boolean"],
  ["relatives", "Parentes na empresa", "boolean"],
];
const diversity = [
  ["gender", "Gênero"],
  ["orientation", "Orientação sexual"],
  ["race", "Raça/cor"],
  ["disability", "Pessoa com deficiência", "boolean"],
  ["accessibility", "Necessidade de acessibilidade", "boolean"],
];
function answerText(answer: AnswerValue): string {
  if (Array.isArray(answer.value)) return answer.value.join(", ");
  if (typeof answer.value === "object") return answer.value["pt-BR"] ?? "";
  return String(answer.value);
}
function synonymLines(language: "pt-BR" | "en"): string {
  return Object.entries(state.synonyms[language])
    .map(([key, values]) => key + " = " + values.join(", "))
    .join("\n");
}
function readSynonyms(text: string): Record<string, string[]> {
  const result: Record<string, string[]> = Object.create(null);
  for (const line of text.split("\n").filter((line) => line.trim())) {
    const index = line.indexOf("=");
    if (index < 1)
      throw new Error(
        "Use o formato assunto = variação, outra variação nos sinônimos.",
      );
    const key = line.slice(0, index).trim();
    const values = line
      .slice(index + 1)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (!values.length)
      throw new Error("Cada assunto precisa de pelo menos uma variação.");
    result[key] = values;
  }
  return result;
}
function valueOf(key: string): string {
  const answer = state.candidate[key];
  if (!answer) return "";
  if (typeof answer.value === "object" && !Array.isArray(answer.value))
    return answer.value["pt-BR"] ?? "";
  return String(answer.value);
}
function notify(message: string) {
  document.querySelector("#feedback")!.textContent = message;
}
function formFields(fields: string[][]) {
  return fields
    .map(([key, label, type]) => {
      const existing = state.candidate[key!];
      if (existing)
        type =
          existing.type === "boolean"
            ? "boolean"
            : existing.type === "salary"
              ? "salary"
              : existing.type === "number" ||
                  existing.type === "experience-years"
                ? "number"
                : existing.type === "phone"
                  ? "tel"
                  : ["email", "url", "date"].includes(existing.type)
                    ? existing.type
                    : "text";
      if (type === "salary" && existing?.type === "salary")
        label = label!
          .replace(
            "mensal",
            ({ month: "mensal", year: "anual", hour: "por hora" } as const)[
              existing.period
            ],
          )
          .replace("BRL", existing.currency);
      return type === "boolean"
        ? '<div><label for="' +
            key +
            '">' +
            label +
            '</label><select id="' +
            key +
            '" name="' +
            key +
            '"><option value="">Não informado</option><option value="true" ' +
            (valueOf(key!) === "true" ? "selected" : "") +
            '>Sim</option><option value="false" ' +
            (valueOf(key!) === "false" ? "selected" : "") +
            ">Não</option></select></div>"
        : field(
            key!,
            label!,
            valueOf(key!),
            type === "salary" ? "number" : (type ?? "text"),
          );
    })
    .join("");
}
function section(title: string, description: string, content: string) {
  return (
    '<section class="section section-heading"><div><h2>' +
    title +
    "</h2><p>" +
    description +
    "</p></div><div>" +
    content +
    "</div></section>"
  );
}
function empty(title: string, text: string) {
  return '<div class="empty"><h2>' + title + "</h2><p>" + text + "</p></div>";
}
function body(): string {
  if (page === "ensinados") return renderMappings(state);
  if (page === "dados")
    return (
      '<form id="personal">' +
      section(
        "Identificação",
        "Somente informações que você cadastrar serão usadas.",
        '<div class="grid">' + formFields(personal) + "</div>",
      ) +
      section(
        "Contato e links",
        "Mantenha seus contatos e endereços atualizados.",
        '<div class="grid">' + formFields(contact) + "</div>",
      ) +
      section(
        "Perfil profissional",
        "Disponibilidade e respostas profissionais recorrentes.",
        '<div class="grid">' + formFields(professional) + "</div>",
      ) +
      section(
        "Diversidade e acessibilidade",
        "Preenchimento opcional. Dados cadastrados poderão ser usados após seu comando.",
        '<div class="grid">' + formFields(diversity) + "</div>",
      ) +
      section(
        "Formação",
        "Registre sua formação principal.",
        '<div class="grid">' +
          field("institution", "Instituição", state.education[0]?.institution) +
          field("course", "Curso", state.education[0]?.course) +
          field(
            "semester",
            "Semestre atual",
            String(state.education[0]?.semester ?? ""),
            "number",
          ) +
          field("modality", "Modalidade", state.education[0]?.modality) +
          field("shift", "Turno", state.education[0]?.shift) +
          field(
            "startYear",
            "Ano de início",
            String(state.education[0]?.startYear ?? ""),
            "number",
          ) +
          field(
            "endYear",
            "Ano de conclusão",
            String(state.education[0]?.endYear ?? ""),
            "number",
          ) +
          "</div>",
      ) +
      section(
        "Formação técnica",
        "Opcional. Registre uma segunda formação.",
        '<div class="grid">' +
          field(
            "technicalInstitution",
            "Instituição técnica",
            state.education[1]?.institution,
          ) +
          field(
            "technicalCourse",
            "Curso técnico",
            state.education[1]?.course,
          ) +
          field(
            "technicalStart",
            "Início do curso técnico",
            String(state.education[1]?.startYear ?? ""),
            "number",
          ) +
          field(
            "technicalEnd",
            "Conclusão do curso técnico",
            String(state.education[1]?.endYear ?? ""),
            "number",
          ) +
          "</div>",
      ) +
      '<div class="actions"><button>Salvar meus dados</button><span>Salvos somente neste navegador.</span></div></form>'
    );
  if (page === "experiencias")
    return (
      (state.experiences.length
        ? state.experiences
            .map(
              (e) =>
                '<article class="entry"><header><div><h2>' +
                escape(e.role) +
                "</h2><small>" +
                escape(e.organization) +
                " · " +
                escape(e.startMonth) +
                " — " +
                escape(e.current ? "Atual" : e.endMonth) +
                '</small></div><div class="inline"><button class="secondary" data-edit="' +
                e.id +
                '">Editar</button><button class="secondary" data-delete="' +
                e.id +
                '">Excluir</button></div></header><p>' +
                escape(e.fullDescription["pt-BR"]) +
                "</p></article>",
            )
            .join("")
        : empty(
            "Sua trajetória começa aqui",
            "Adicione experiências profissionais, voluntariado ou projetos. As descrições completas terão espaço para todos os detalhes.",
          )) + '<div id="editor"></div>'
    );
  if (page === "respostas")
    return (
      (state.rules.length
        ? state.rules
            .map(
              (r) =>
                '<article class="entry"><header><div><h2>' +
                escape(r.name) +
                "</h2><small>" +
                escape(r.answer.type) +
                " · " +
                (r.enabled ? "Ativa" : "Desativada") +
                '</small></div><div class="inline"><button class="secondary" data-toggle="' +
                r.id +
                '">' +
                (r.enabled ? "Desativar" : "Ativar") +
                '</button><button class="secondary" data-edit="' +
                r.id +
                '">Editar</button><button class="secondary" data-delete="' +
                r.id +
                '">Excluir</button></div></header><p>' +
                escape(r.keywords.join(", ")) +
                "</p></article>",
            )
            .join("")
        : empty(
            "Menos repetição. Mais tempo.",
            "Cadastre palavras-chave e respostas. As respostas ativas já podem preencher inputs simples. Textos longos aparecem como sugestões.",
          )) + '<div id="editor"></div>'
    );
  if (page === "perfis")
    return (
      (state.profiles.length
        ? state.profiles
            .map(
              (p) =>
                '<article class="entry"><header><div><h2>' +
                escape(p.name) +
                "</h2><small>Currículo: " +
                escape(p.preferredResumeName || "Não informado") +
                '</small></div><div class="inline"><button class="secondary" data-edit="' +
                p.id +
                '">Editar</button><button class="secondary" data-delete="' +
                p.id +
                '">Excluir</button></div></header><p>' +
                escape(p.introduction["pt-BR"]) +
                "</p></article>",
            )
            .join("")
        : empty(
            "Cada oportunidade pede um perfil",
            "Crie seus perfis Backend, Full Stack ou Suporte. Indique o nome do currículo; nenhum arquivo será anexado automaticamente.",
          )) + '<div id="editor"></div>'
    );
  if (page === "preferencias") {
    const c = state.settings.confidence;
    return (
      '<form id="preferences">' +
      section(
        "Confiança",
        "Pontuações são indicadores das regras, não garantias de acerto.",
        '<div class="grid">' +
          field(
            "automaticMinimum",
            "Mínimo para preencher",
            String(c.automaticMinimum),
            "number",
          ) +
          field(
            "highlightedMinimum",
            "Mínimo para sugerir",
            String(c.highlightedMinimum),
            "number",
          ) +
          field(
            "minimumLead",
            "Diferença mínima entre regras",
            String(c.minimumLead),
            "number",
          ) +
          '</div><div class="actions check"><input id="medium" name="medium" type="checkbox" ' +
          (c.fillMediumConfidence ? "checked" : "") +
          '><label for="medium">Permitir preenchimento com confiança intermediária</label></div>',
      ) +
      section(
        "Proteção",
        "Campos com informação existente são preservados por padrão.",
        '<div class="check"><input id="preserve" name="preserve" type="checkbox" ' +
          (state.settings.preserveExisting ? "checked" : "") +
          '><label for="preserve">Preservar campos já preenchidos</label></div>',
      ) +
      section(
        "Sinônimos",
        "Use uma linha por assunto. Exemplo: salário = remuneração, pretensão salarial.",
        '<div class="grid">' +
          area("synonymsPt", "Sinônimos em português", synonymLines("pt-BR")) +
          area("synonymsEn", "Sinônimos em inglês", synonymLines("en")) +
          "</div>",
      ) +
      "<button>Salvar preferências</button></form>"
    );
  }
  return (
    section(
      "Local por princípio",
      "Não há backend ou envio de dados para servidores.",
      "<p>Dados, respostas e experiências ficam no armazenamento local da extensão. O envio de candidaturas continua sempre manual.</p><p>O armazenamento do navegador não é um cofre criptografado. Não cadastre senhas, tokens, códigos de autenticação ou dados bancários.</p>",
    ) +
    section(
      "Backup e transferência",
      "Arquivos ficam no seu computador. Backup completo contém informações pessoais sem criptografia.",
      '<div class="actions"><button id="export-preferences" class="secondary">Exportar preferências</button><button id="export-full" class="secondary">Exportar backup completo</button></div><p>Preferências incluem apenas limites de confiança e sinônimos. Backup completo inclui dados, perfis e respostas; logs ficam de fora.</p><label for="import-file">Importar backup JSON (até 5 MB)</label><input id="import-file" type="file" accept="application/json,.json"><div id="import-review"></div>',
    ) +
    section(
      "Restaurar e apagar",
      "Ações diferentes para necessidades diferentes.",
      '<p>Restaurar preferências mantém dados, experiências, perfis e respostas. Apagar todos os dados remove também o perfil selecionado e logs deste navegador.</p><div class="actions"><button id="restore-defaults" class="secondary">Restaurar preferências</button><button id="clear-logs" class="secondary">Apagar logs</button><button id="clear-all" class="secondary">Apagar todos os dados</button></div>',
    )
  );
}
function bindPrivacy() {
  const download = (includePersonal: boolean) => {
    if (
      includePersonal &&
      !confirm(
        "Este arquivo contém seus dados pessoais sem criptografia. Deseja exportar o backup completo?",
      )
    )
      return;
    try {
      const data = exportBackup(state, includePersonal);
      const url = URL.createObjectURL(
        new Blob([data], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = includePersonal
        ? "backup-candidaturas.json"
        : "preferencias-candidaturas.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Arquivo preparado para download.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Não foi possível exportar.",
      );
    }
  };
  document
    .querySelector("#export-preferences")
    ?.addEventListener("click", () => download(false));
  document
    .querySelector("#export-full")
    ?.addEventListener("click", () => download(true));
  document
    .querySelector<HTMLInputElement>("#import-file")
    ?.addEventListener("change", async (event) => {
      const input = event.currentTarget as HTMLInputElement;
      const file = input.files?.[0];
      const review = document.querySelector<HTMLElement>("#import-review")!;
      review.replaceChildren();
      if (!file) return;
      if (file.size > MAX_IMPORT_BYTES) {
        notify("Arquivo excede o limite de 5 MB.");
        input.value = "";
        return;
      }
      try {
        const text = await file.text();
        const imported = importBackup(text);
        const scope = (JSON.parse(text) as { scope: string }).scope;
        const note = document.createElement("p");
        note.textContent =
          scope === "preferences"
            ? "Backup de preferências validado. Seus dados pessoais e respostas serão mantidos."
            : "Backup validado: " +
              Object.keys(imported.candidate).length +
              " dados, " +
              imported.experiences.length +
              " experiências, " +
              imported.rules.length +
              " respostas, " +
              imported.profiles.length +
              " perfis. Aplicar substituirá todos os registros atuais.";
        const apply = document.createElement("button");
        apply.type = "button";
        apply.textContent =
          scope === "preferences"
            ? "Importar preferências"
            : "Substituir dados pelo backup";
        apply.addEventListener("click", () => {
          if (!confirmDiscard()) return;
          if (
            scope !== "preferences" &&
            !confirm(
              "Substituir todos os dados atuais pelo backup validado? Esta ação não pode ser desfeita.",
            )
          )
            return;
          const next =
            scope === "preferences"
              ? {
                  ...structuredClone(state),
                  settings: imported.settings,
                  synonyms: imported.synonyms,
                }
              : imported;
          void persist(next);
        });
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "secondary";
        cancel.textContent = "Cancelar importação";
        cancel.onclick = () => {
          review.replaceChildren();
          input.value = "";
          input.focus();
        };
        const actions = document.createElement("div");
        actions.className = "actions";
        actions.append(apply, cancel);
        review.append(note, actions);
        apply.focus();
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : "Não foi possível ler o arquivo.",
        );
        input.value = "";
      }
    });
  document.querySelector("#restore-defaults")?.addEventListener("click", () => {
    if (
      !confirm(
        "Restaurar preferências padrão? Seus dados, perfis e respostas serão mantidos.",
      )
    )
      return;
    const next = structuredClone(state);
    next.settings = createDefaultState().settings;
    next.synonyms = createDefaultState().synonyms;
    void persist(next);
  });
  document.querySelector("#clear-logs")?.addEventListener("click", () => {
    if (!confirm("Apagar todos os logs locais?")) return;
    const next = structuredClone(state);
    next.logs = [];
    void persist(next);
  });
  document.querySelector("#clear-all")?.addEventListener("click", async () => {
    if (
      busy ||
      !confirm(
        "Apagar permanentemente todos os dados desta extensão neste navegador? Faça um backup antes. Esta ação não pode ser desfeita.",
      )
    )
      return;
    busy = true;
    try {
      await clearAllData();
      state = createDefaultState();
      render();
      restoreFocus();
      notify(
        preview
          ? "Dados da prévia apagados."
          : "Todos os dados locais foram apagados.",
      );
    } catch {
      notify("Não foi possível apagar. Tente novamente.");
    } finally {
      busy = false;
    }
  });
}
function render() {
  document.querySelector("#app")!.innerHTML =
    '<div class="shell"><aside class="sidebar"><div class="brand">Candidaturas<span>Assistente local</span></div><nav aria-label="Configurações">' +
    Object.entries(pages)
      .map(
        ([id, name]) =>
          '<button data-page="' +
          id +
          '" ' +
          (page === id ? 'aria-current="page"' : "") +
          ">" +
          name +
          "</button>",
      )
      .join("") +
    '</nav><footer>Preencha com cuidado.<br>Envie quando estiver pronto.</footer></aside><div class="workspace"><header class="topbar"><span>Seu espaço de candidatura</span><span class="local-indicator">' +
    (preview ? "Prévia sem persistência" : "Dados neste navegador") +
    '</span></header><main class="content" id="main"><div class="intro"><div><h1>' +
    pages[page] +
    "</h1><p>" +
    descriptions[page] +
    "</p></div>" +
    (["experiencias", "respostas", "perfis"].includes(page)
      ? '<button id="add" class="secondary">' +
        {
          experiencias: "Adicionar experiência",
          respostas: "Adicionar resposta",
          perfis: "Adicionar perfil",
        }[page] +
        "</button>"
      : "") +
    "</div>" +
    (preview
      ? '<div class="notice">Prévia visual. Alterações duram somente até recarregar esta página. Para salvar no navegador, abra pelas configurações da extensão.</div>'
      : "") +
    body() +
    '</main></div></div><div id="feedback" role="status" aria-live="polite"></div>';
  bind();
}
async function persist(next: AppState) {
  if (busy) return;
  busy = true;
  try {
    await saveState(next);
    state = next;
    render();
    restoreFocus();
    notify(
      preview
        ? "Alterações aplicadas à prévia."
        : "Alterações salvas neste navegador.",
    );
  } catch (error) {
    notify(
      error instanceof Error
        ? error.message
        : "Não foi possível salvar. Seus campos continuam disponíveis; tente novamente.",
    );
  } finally {
    busy = false;
  }
}
function confirmDiscard(): boolean {
  return (
    document.querySelector("form")?.getAttribute("data-dirty") !== "true" ||
    confirm("Existem alterações não salvas. Deseja descartá-las?")
  );
}
function restoreFocus() {
  const target =
    document.querySelector<HTMLElement>("#add") ??
    document.querySelector<HTMLElement>("h1");
  if (target?.tagName === "H1") target.setAttribute("tabindex", "-1");
  target?.focus();
}
function bind() {
  bindMappings(state, { save: persist, notify, confirmDiscard, restoreFocus });
  bindPrivacy();
  document.querySelectorAll<HTMLButtonElement>("[data-page]").forEach(
    (b) =>
      (b.onclick = () => {
        if (
          document.querySelector("form")?.dataset.dirty === "true" &&
          !confirm("Existem alterações não salvas. Deseja descartá-las?")
        )
          return;
        page = b.dataset.page!;
        render();
        document
          .querySelector<HTMLElement>("h1")
          ?.setAttribute("tabindex", "-1");
        document.querySelector<HTMLElement>("h1")?.focus();
      }),
  );
  document.querySelectorAll("form").forEach((f) => {
    f.addEventListener("input", () => {
      f.dataset.dirty = "true";
    });
  });
  document.querySelector("#add")?.addEventListener("click", () => editor());
  document
    .querySelectorAll<HTMLButtonElement>("[data-edit]")
    .forEach((b) => (b.onclick = () => editor(b.dataset.edit)));
  document.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!confirmDiscard() || !confirm("Excluir este registro?")) return;
        const next = structuredClone(state);
        if (page === "experiencias") {
          next.experiences = next.experiences.filter(
            (e) => e.id !== b.dataset.delete,
          );
          next.profiles.forEach(
            (p) =>
              (p.experienceIds = p.experienceIds.filter(
                (id) => id !== b.dataset.delete,
              )),
          );
        }
        if (page === "respostas") {
          next.rules = next.rules.filter((r) => r.id !== b.dataset.delete);
          next.mappings = next.mappings.filter(
            (m) => m.ruleId !== b.dataset.delete,
          );
        }
        if (page === "perfis") {
          for (const rule of next.rules)
            if (rule.profileIds)
              rule.profileIds = rule.profileIds.filter(
                (id) => id !== b.dataset.delete,
              );
          next.profiles = next.profiles.filter(
            (p) => p.id !== b.dataset.delete,
          );
        }
        if (page === "respostas")
          for (const profile of next.profiles)
            delete profile.answerOverrides[b.dataset.delete!];
        void persist(next);
      }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach(
    (b) =>
      (b.onclick = () => {
        const next = structuredClone(state);
        if (!confirmDiscard()) return;
        const r = next.rules.find((r) => r.id === b.dataset.toggle);
        if (r) r.enabled = !r.enabled;
        void persist(next);
      }),
  );
  document
    .querySelector<HTMLFormElement>("#personal")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget as HTMLFormElement);
      const next = structuredClone(state);
      for (const [key, , type] of [
        ...personal,
        ...contact,
        ...professional,
        ...diversity,
      ]) {
        const value = String(data.get(key!) ?? "").trim();
        const previous = state.candidate[key!];
        if (previous && value === valueOf(key!)) continue;
        if (!value) {
          delete next.candidate[key!];
          continue;
        }
        try {
          const answer = editAnswer(
            previous,
            value,
            type === "tel"
              ? "phone"
              : type === "number"
                ? "experience-years"
                : ["salary", "boolean", "email", "url", "date"].includes(
                      type ?? "",
                    )
                  ? (type as "salary" | "boolean" | "email" | "url" | "date")
                  : "text",
          );
          if (answer) next.candidate[key!] = answer;
          else delete next.candidate[key!];
        } catch (error) {
          notify(error instanceof Error ? error.message : "Resposta inválida.");
          return;
        }
      }
      const institution = String(data.get("institution") ?? "").trim(),
        course = String(data.get("course") ?? "").trim();
      const start = Number(data.get("startYear"));
      const end = Number(data.get("endYear"));
      const semester = Number(data.get("semester"));
      if (institution || course) {
        if (
          !institution ||
          !course ||
          start < 1900 ||
          start > 2200 ||
          (end && end < start) ||
          (semester && (!Number.isInteger(semester) || semester < 1))
        ) {
          notify(
            "Informe instituição, curso e ano inicial válido. Confira conclusão e semestre.",
          );
          return;
        }
        const education = {
          id: state.education[0]?.id ?? crypto.randomUUID(),
          institution,
          course,
          startYear: start,
          ...(end ? { endYear: end } : {}),
          ...(semester ? { semester } : {}),
          modality: String(data.get("modality") ?? ""),
          shift: String(data.get("shift") ?? ""),
        };
        next.education = [education, ...state.education.slice(1)];
      } else next.education = state.education.slice(1);
      const ti = String(data.get("technicalInstitution") ?? "").trim(),
        tc = String(data.get("technicalCourse") ?? "").trim(),
        ts = Number(data.get("technicalStart")),
        te = Number(data.get("technicalEnd"));
      const main = next.education.find(
        (e) => e.id === (state.education[0]?.id ?? next.education[0]?.id),
      );
      if (ti || tc) {
        if (!institution || !course) {
          notify(
            "Cadastre a formação principal antes de adicionar a formação técnica.",
          );
          return;
        }
        if (!ti || !tc || ts < 1900 || ts > 2200 || (te && te < ts)) {
          notify("Confira instituição, curso e datas da formação técnica.");
          return;
        }
        const technical = {
          id: state.education[1]?.id ?? crypto.randomUUID(),
          institution: ti,
          course: tc,
          startYear: ts,
          ...(te ? { endYear: te } : {}),
        };
        next.education = [
          ...(institution || course ? (main ? [main] : []) : []),
          technical,
          ...state.education.slice(2),
        ];
      } else
        next.education = [
          ...(institution || course ? (main ? [main] : []) : []),
          ...state.education.slice(2),
        ];
      void persist(next);
    });
  document
    .querySelector<HTMLFormElement>("#preferences")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget as HTMLFormElement);
      const a = Number(data.get("automaticMinimum")),
        h = Number(data.get("highlightedMinimum")),
        lead = Number(data.get("minimumLead"));
      if (
        ![a, h, lead].every((n) => Number.isFinite(n) && n >= 0 && n <= 100) ||
        h > a ||
        lead < 1
      ) {
        notify(
          "Use valores entre 0 e 100. Sugestão não pode superar preenchimento; diferença mínima deve ser ao menos 1.",
        );
        return;
      }
      const next = structuredClone(state);
      next.settings.confidence = {
        automaticMinimum: a,
        highlightedMinimum: h,
        minimumLead: lead,
        fillMediumConfidence: data.has("medium"),
      };
      try {
        next.synonyms = {
          "pt-BR": readSynonyms(String(data.get("synonymsPt") ?? "")),
          en: readSynonyms(String(data.get("synonymsEn") ?? "")),
        };
      } catch (error) {
        notify(error instanceof Error ? error.message : "Sinônimos inválidos.");
        return;
      }
      next.settings.preserveExisting = data.has("preserve");
      void persist(next);
    });
}
function editor(id?: string) {
  const target = document.querySelector("#editor")!;
  if (
    target.querySelector("form")?.getAttribute("data-dirty") === "true" &&
    !confirm("Descartar alterações deste registro?")
  )
    return;
  let fields = "";
  if (page === "experiencias") {
    const e = state.experiences.find((e) => e.id === id);
    fields =
      field("organization", "Empresa ou organização", e?.organization) +
      field("role", "Cargo", e?.role) +
      field("startMonth", "Início", e?.startMonth, "month") +
      field("endMonth", "Fim", e?.endMonth, "month") +
      '<div class="check wide"><input id="current" name="current" type="checkbox" ' +
      (e?.current ? "checked" : "") +
      '><label for="current">Trabalho atual</label></div>' +
      area("short", "Descrição curta", e?.shortDescription["pt-BR"]) +
      area("full", "Descrição completa", e?.fullDescription["pt-BR"]) +
      area("english", "Descrição completa em inglês", e?.fullDescription.en) +
      area(
        "activities",
        "Principais atividades — uma por linha",
        e?.activities.map((a) => a["pt-BR"]).join("\n"),
      );
  }
  if (page === "perfis") {
    const p = state.profiles.find((p) => p.id === id);
    fields =
      field("name", "Nome do perfil", p?.name) +
      field("resume", "Nome do currículo PDF", p?.preferredResumeName) +
      field(
        "technologies",
        "Tecnologias — separadas por vírgula",
        p?.technologies.join(", "),
        "text",
        true,
      ) +
      area(
        "introduction",
        "Apresentação em português",
        p?.introduction["pt-BR"],
      ) +
      area("english", "Apresentação em inglês", p?.introduction.en);
  }
  if (page === "respostas") {
    const r = state.rules.find((r) => r.id === id);
    fields =
      field("name", "Nome interno", r?.name) +
      field("category", "Categoria", r?.category) +
      field("subject", "Assunto", r?.subject) +
      field("priority", "Prioridade", String(r?.priority ?? 0), "number") +
      field(
        "keywords",
        "Palavras-chave — separadas por vírgula",
        r?.keywords.join(", "),
        "text",
        true,
      ) +
      field(
        "excludedKeywords",
        "Expressões que impedem correspondência — separadas por vírgula",
        r?.excludedKeywords.join(", "),
        "text",
        true,
      ) +
      '<div><label for="domainScope">Onde usar</label><select id="domainScope" name="domainScope"><option value="all" ' +
      (!r?.domains ? "selected" : "") +
      '>Todos os sites</option><option value="limited" ' +
      (r?.domains ? "selected" : "") +
      ">Somente os sites abaixo</option></select></div>" +
      field(
        "domains",
        "Sites permitidos — domínios separados por vírgula",
        r?.domains?.join(", "),
        "text",
        true,
      ) +
      '<div><label for="insertion">Inserção</label><select id="insertion" name="insertion"><option value="automatic" ' +
      (r?.insertion !== "suggestion" ? "selected" : "") +
      '>Automática quando confiável</option><option value="suggestion" ' +
      (r?.insertion === "suggestion" ? "selected" : "") +
      '>Somente sugerir</option></select></div><p class="wide">Perguntas discursivas nunca são preenchidas automaticamente. Prioridade ordena sugestões; correspondências próximas exigem revisão.</p>' +
      '<div><label for="type">Tipo de resposta</label><select id="type" name="type">' +
      [
        ["text", "Texto"],
        ["long-text", "Texto longo — sugestão"],
        ["boolean", "Sim/não"],
        ["experience-years", "Anos de experiência"],
        ["number", "Número"],
        ["single-choice", "Opção única"],
        ["multiple-choice", "Múltipla escolha"],
        ["url", "URL"],
        ["email", "E-mail"],
        ["phone", "Telefone"],
        ["date", "Data (AAAA-MM-DD)"],
        ["salary", "Salário"],
      ]
        .map(
          ([v, l]) =>
            '<option value="' +
            v +
            '" ' +
            (r?.answer.type === v ? "selected" : "") +
            ">" +
            l +
            "</option>",
        )
        .join("") +
      "</select></div>" +
      field(
        "currency",
        "Moeda para salário (BRL, USD...)",
        r?.answer.type === "salary" ? r.answer.currency : "BRL",
      ) +
      '<div><label for="salaryPeriod">Período do salário</label><select id="salaryPeriod" name="salaryPeriod">' +
      [
        ["month", "Mensal"],
        ["year", "Anual"],
        ["hour", "Por hora"],
      ]
        .map(
          ([value, label]) =>
            '<option value="' +
            value +
            '" ' +
            (r?.answer.type === "salary" && r.answer.period === value
              ? "selected"
              : "") +
            ">" +
            label +
            "</option>",
        )
        .join("") +
      '</select></div><p class="wide">Múltipla escolha: separe respostas por vírgula. Data: AAAA-MM-DD. Moeda e período se aplicam somente a salário.</p>' +
      area("answer", "Resposta em português", r ? answerText(r.answer) : "") +
      area(
        "english",
        "Resposta em inglês — para textos",
        r &&
          typeof r.answer.value === "object" &&
          !Array.isArray(r.answer.value)
          ? r.answer.value.en
          : "",
      );
  }
  target.innerHTML =
    '<form class="section" id="record"><h2>' +
    (id ? "Editar registro" : "Novo registro") +
    '</h2><div class="grid">' +
    fields +
    '</div><div class="actions"><button>Salvar registro</button><button type="button" id="cancel" class="secondary">Cancelar</button></div></form>';
  const form = target.querySelector<HTMLFormElement>("form")!;
  form.addEventListener("input", () => (form.dataset.dirty = "true"));
  const current = form.querySelector<HTMLInputElement>("#current"),
    end = form.querySelector<HTMLInputElement>("#endMonth");
  if (current && end) {
    const update = () => {
      end.disabled = current.checked;
    };
    current.onchange = update;
    update();
  }
  target.querySelector("#cancel")!.addEventListener("click", () => {
    if (form.dataset.dirty === "true" && !confirm("Descartar alterações?"))
      return;
    target.replaceChildren();
    restoreFocus();
  });
  const domainScope = form.querySelector<HTMLSelectElement>("#domainScope"),
    domainInput = form.querySelector<HTMLInputElement>("#domains");
  if (domainScope && domainInput) {
    const update = () => (domainInput.disabled = domainScope.value === "all");
    domainScope.addEventListener("change", update);
    update();
  }
  form.querySelector<HTMLInputElement>("input")?.focus();
  form.onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const next = structuredClone(state);
    const recordId = id ?? crypto.randomUUID();
    if (page === "experiencias") {
      if (
        !get("organization") ||
        !get("role") ||
        !get("startMonth") ||
        (!data.has("current") && !get("endMonth")) ||
        (get("endMonth") && get("endMonth") < get("startMonth"))
      ) {
        notify(
          "Informe empresa, cargo e datas válidas. Para trabalho atual, marque a opção.",
        );
        return;
      }
      const previousExperience = state.experiences.find(
        (e) => e.id === recordId,
      );
      const record = {
        id: recordId,
        organization: get("organization"),
        role: get("role"),
        startMonth: get("startMonth"),
        ...(data.has("current") ? {} : { endMonth: get("endMonth") }),
        current: data.has("current"),
        shortDescription: {
          ...previousExperience?.shortDescription,
          "pt-BR": get("short"),
        },
        fullDescription: { "pt-BR": get("full"), en: get("english") },
        activities: get("activities")
          .split("\n")
          .filter(Boolean)
          .map<LocalizedText>((text) => ({
            ...previousExperience?.activities.find((a) => a["pt-BR"] === text),
            "pt-BR": text,
          }))
          .concat(
            previousExperience?.activities.filter((a) => !a["pt-BR"]) ?? [],
          ),
      };
      next.experiences = next.experiences.filter((e) => e.id !== recordId);
      next.experiences.push(record);
    }
    if (page === "perfis") {
      if (!get("name")) {
        notify("Informe o nome do perfil.");
        return;
      }
      const old = state.profiles.find((p) => p.id === id);
      next.profiles = next.profiles.filter((p) => p.id !== recordId);
      next.profiles.push({
        id: recordId,
        name: get("name"),
        preferredResumeName: get("resume"),
        technologies: get("technologies")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        introduction: { "pt-BR": get("introduction"), en: get("english") },
        experienceIds: old?.experienceIds ?? [],
        answerOverrides: old?.answerOverrides ?? {},
      });
    }
    if (page === "respostas") {
      const type = get("type");
      let answer: AnswerValue;
      const value = get("answer");
      if (
        !get("name") ||
        !get("keywords") ||
        !value ||
        !get("subject") ||
        !Number.isFinite(Number(get("priority")))
      ) {
        notify(
          "Informe nome, assunto, palavras-chave, resposta e prioridade válida.",
        );
        return;
      }
      if (type === "boolean") {
        if (
          !["sim", "não", "nao", "yes", "no", "true", "false"].includes(
            value.toLowerCase(),
          )
        ) {
          notify("Para sim/não, escreva Sim ou Não.");
          return;
        }
        answer = {
          type: "boolean",
          value: ["sim", "yes", "true"].includes(value.toLowerCase()),
        };
      } else if (type === "number" || type === "experience-years") {
        const n = Number(value.replace(",", "."));
        if (!Number.isFinite(n) || n < 0) {
          notify("Informe um número válido, maior ou igual a zero.");
          return;
        }
        answer = { type, value: n };
      } else if (type === "salary") {
        answer = {
          type: "salary",
          value: Number(value.replace(",", ".")),
          currency: get("currency").toUpperCase(),
          period: get("salaryPeriod") as "month" | "year" | "hour",
        };
      } else if (type === "multiple-choice") {
        answer = {
          type: "multiple-choice",
          value: value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        };
      } else if (
        ["single-choice", "url", "email", "phone", "date"].includes(type)
      ) {
        answer = {
          type: type as "single-choice" | "url" | "email" | "phone" | "date",
          value,
        };
      } else
        answer = {
          type: type === "long-text" ? "long-text" : "text",
          value: { "pt-BR": value, en: get("english") },
        };
      if (get("domainScope") === "limited" && !get("domains")) {
        notify("Informe pelo menos um domínio ou selecione Todos os sites.");
        return;
      }
      if (
        get("domains") &&
        get("domains")
          .split(",")
          .some(
            (domain) =>
              !/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
                domain.trim(),
              ),
          )
      ) {
        notify("Informe somente domínios, sem https, caminhos ou curingas.");
        return;
      }
      const old = state.rules.find((r) => r.id === id);
      next.rules = next.rules.filter((r) => r.id !== recordId);
      next.rules.push({
        id: recordId,
        name: get("name"),
        category: get("category"),
        subject: get("subject"),
        keywords: get("keywords")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        excludedKeywords: get("excludedKeywords")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        answer,
        enabled: old?.enabled ?? true,
        priority: Number(get("priority")),
        insertion:
          type === "long-text" || get("insertion") === "suggestion"
            ? "suggestion"
            : "automatic",
        ...(old?.profileIds ? { profileIds: old.profileIds } : {}),
        ...(get("domainScope") === "limited"
          ? {
              domains: get("domains")
                .split(",")
                .map((domain) => domain.trim().toLowerCase())
                .filter(Boolean),
            }
          : {}),
      });
    }
    void persist(next);
  };
}
window.addEventListener("beforeunload", (event) => {
  if (document.querySelector("form")?.getAttribute("data-dirty") === "true") {
    event.preventDefault();
  }
});
void loadState()
  .then((value) => {
    state = value;
    render();
  })
  .catch((error) => {
    const app = document.querySelector("#app")!;
    app.innerHTML =
      '<main class="content"><h1>Seus dados foram preservados.</h1><p id="load-error"></p><p>Não foi possível abrir as configurações. Você pode salvar uma cópia dos dados antes de apagar e recomeçar.</p><div class="actions"><button id="recover">Baixar cópia para recuperação</button><button class="secondary" id="restart">Apagar dados e recomeçar</button></div></main>';
    document.querySelector("#load-error")!.textContent =
      error instanceof Error ? error.message : "Dados incompatíveis.";
    document.querySelector("#recover")!.addEventListener("click", async () => {
      if (
        !confirm(
          "A cópia pode conter dados pessoais sem criptografia. Deseja baixar?",
        )
      )
        return;
      const stored = preview ? {} : await chrome.storage.local.get(null);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(stored, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "recuperacao-candidaturas.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    document.querySelector("#restart")!.addEventListener("click", async () => {
      if (
        !confirm(
          "Apagar permanentemente todos os dados e recomeçar? Esta ação não pode ser desfeita.",
        )
      )
        return;
      try {
        await clearAllData();
        state = createDefaultState();
        render();
        notify("Dados apagados. Você pode recomeçar.");
      } catch {
        document.querySelector("#load-error")!.textContent =
          "Não foi possível apagar. Tente novamente.";
      }
    });
  });
