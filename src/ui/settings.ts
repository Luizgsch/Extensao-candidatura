import type { AppState, AnswerValue } from "../shared/types";
import { loadState, saveState, preview } from "./storage";
let state: AppState;
let page = "dados";
let busy = false;
const pages: Record<string, string> = {
  dados: "Meus dados",
  experiencias: "Experiências",
  respostas: "Minhas respostas",
  perfis: "Perfis",
  preferencias: "Preferências",
  privacidade: "Privacidade",
};
const descriptions: Record<string, string> = {
  dados: "Organize uma vez. Leve suas informações para cada oportunidade.",
  experiencias: "Sua trajetória, com espaço para contar os detalhes.",
  respostas: "Guarde respostas recorrentes, sem repetir o trabalho.",
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
  '" value="' +
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
    .map(([key, label, type]) =>
      field(key!, label!, valueOf(key!), type ?? "text"),
    )
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
            "Cadastre palavras-chave e respostas. A correspondência com formulários será conectada nas próximas etapas.",
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
      "O que está disponível",
      "Esta é a etapa de interface e organização.",
      "<p>Cadastro de dados, experiências, respostas, perfis e preferências. Importação, exportação, limpeza integral e logs serão adicionados na etapa de gerenciamento de dados.</p>",
    )
  );
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
  } catch {
    notify(
      "Não foi possível salvar. Seus campos continuam disponíveis; tente novamente.",
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
        if (page === "perfis")
          next.profiles = next.profiles.filter(
            (p) => p.id !== b.dataset.delete,
          );
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
      for (const [key, , type] of [...personal, ...contact]) {
        const value = String(data.get(key!) ?? "").trim();
        if (!value) {
          delete next.candidate[key!];
          continue;
        }
        next.candidate[key!] =
          type === "email" ||
          type === "url" ||
          type === "tel" ||
          type === "date"
            ? ({ type: type === "tel" ? "phone" : type, value } as AnswerValue)
            : { type: "text", value: { "pt-BR": value } };
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
      '<div><label for="type">Tipo de resposta</label><select id="type" name="type">' +
      [
        ["text", "Texto"],
        ["long-text", "Texto longo — sugestão"],
        ["boolean", "Sim/não"],
        ["experience-years", "Anos de experiência"],
        ["number", "Número"],
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
      area(
        "answer",
        "Resposta em português",
        r
          ? typeof r.answer.value === "object" && !Array.isArray(r.answer.value)
            ? r.answer.value["pt-BR"]
            : String(r.answer.value)
          : "",
      ) +
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
      const record = {
        id: recordId,
        organization: get("organization"),
        role: get("role"),
        startMonth: get("startMonth"),
        ...(data.has("current") ? {} : { endMonth: get("endMonth") }),
        current: data.has("current"),
        shortDescription: { "pt-BR": get("short") },
        fullDescription: { "pt-BR": get("full"), en: get("english") },
        activities: get("activities")
          .split("\n")
          .filter(Boolean)
          .map((text) => ({ "pt-BR": text })),
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
      } else
        answer = {
          type: type === "long-text" ? "long-text" : "text",
          value: { "pt-BR": value, en: get("english") },
        };
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
        excludedKeywords: old?.excludedKeywords ?? [],
        answer,
        enabled: old?.enabled ?? true,
        priority: Number(get("priority")),
        insertion: type === "long-text" ? "suggestion" : "automatic",
        ...(old?.profileIds ? { profileIds: old.profileIds } : {}),
        ...(old?.domains ? { domains: old.domains } : {}),
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
  .catch(() => {
    document.querySelector("#app")!.textContent =
      "Não foi possível carregar os dados. Feche e reabra as configurações. Nenhum dado foi alterado.";
  });
