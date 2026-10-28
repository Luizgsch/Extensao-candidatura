import { salaryPrompt } from "./salary-prompt";
import { normalizeText, containsPhrase } from "../normalization";
import type { AnswerValue, Language } from "../../shared/types";
const aliases: Record<string, string[]> = {
  salaryExpectation: ["pretensao salarial"],
  fullName: [
    "nome",
    "nome completo",
    "seu nome completo",
    "qual seu nome completo",
    "name",
    "full name",
    "your full name",
    "candidate name",
  ],
  firstName: ["primeiro nome", "first name", "given name", "given names"],
  lastName: ["sobrenome", "sobrenomes", "last name", "surname", "family name"],
  email: [
    "email",
    "e mail",
    "email address",
    "e mail address",
    "personal email",
    "e mail pessoal",
    "endereco de email",
    "email confirmation",
    "confirm email",
    "confirm email address",
    "confirmacao de email",
    "confirme seu email",
    "confirmar email",
  ],
  phone: [
    "telefone",
    "celular",
    "telefone celular",
    "phone",
    "phone number",
    "mobile phone",
    "mobile",
    "mobile number",
    "numero de telefone",
  ],
  birthDate: ["data de nascimento", "birth date", "date of birth", "dob"],
  cpf: ["cpf"],
  rg: ["rg"],
  issuer: ["orgao expedidor", "orgao emissor"],
  mother: ["nome da mae", "mother name"],
  father: ["nome do pai", "father name"],
  postalCode: ["cep", "postal code", "zip", "zip code"],
  address: [
    "endereco",
    "endereco completo",
    "rua e numero",
    "address",
    "street address",
    "address line 1",
  ],
  complement: ["complemento", "address line 2"],
  city: ["cidade", "city", "town"],
  state: ["estado", "state", "province", "estado uf", "uf"],
  country: ["pais", "country"],
  linkedin: [
    "linkedin",
    "linkedin url",
    "perfil linkedin",
    "linkedin profile",
    "linked in",
    "linked in url",
    "perfil linked in",
    "linked in profile",
  ],
  github: [
    "github",
    "github url",
    "perfil github",
    "github profile",
    "git hub",
    "git hub url",
    "git hub profile",
    "perfil git hub",
  ],
  portfolio: ["portfolio", "portfolio url", "site pessoal", "personal website"],
  desiredRole: ["cargo desejado", "desired role", "desired position"],
  professionalArea: ["area profissional", "professional area"],
  javaYears: [
    "anos de experiencia com java",
    "years of experience with java",
    "java experience years",
  ],
  sqlYears: [
    "anos de experiencia com sql",
    "years of experience with sql",
    "sql experience years",
  ],
  preferredLocation: ["localidade preferida", "preferred location"],
  englishLevel: ["nivel de ingles", "english level"],
};
const auto: Record<string, string> = {
  name: "fullName",
  "given-name": "firstName",
  "family-name": "lastName",
  email: "email",
  tel: "phone",
  "street-address": "address",
  "address-line1": "address",
  "address-line2": "complement",
  "address-level2": "city",
  "address-level1": "state",
  "country-name": "country",
  "postal-code": "postalCode",
  bday: "birthDate",
};
export interface PersonalSignals {
  label: string;
  autocomplete: string;
  name: string;
  id: string;
  placeholder: string;
}
export interface PersonalMatch {
  key?: string;
  score: number;
  ambiguous: boolean;
}
export function normalizeSignal(text: string): string {
  if (salaryPrompt(text)) return "pretensao salarial";
  return normalizeText(text.replace(/([a-z])([A-Z])/g, "$1 $2"))
    .replace(/\be mail\b/g, "email")
    .replace(/ (required|obrigatorio|obrigatoria)$/, "")
    .trim();
}
function keys(text: string): string[] {
  const normalized = normalizeSignal(text);
  return Object.entries(aliases)
    .filter(([, values]) => values.includes(normalized))
    .map(([key]) => key);
}
export function isBlockedSignals(signals: PersonalSignals): boolean {
  const unsafe = [
    "password",
    "senha",
    "token",
    "otp",
    "one time code",
    "verification code",
    "codigo de verificacao",
    "codigo de autenticacao",
    "credit card",
    "bank account",
    "conta bancaria",
    "iban",
    "cvv",
  ];
  const semanticToken = signals.autocomplete.trim().split(/\s+/).at(-1) ?? "";
  if (
    semanticToken.startsWith("tel-") ||
    semanticToken.startsWith("cc-") ||
    semanticToken.startsWith("transaction-") ||
    [
      "organization",
      "organization-title",
      "country",
      "current-password",
      "new-password",
      "one-time-code",
    ].includes(semanticToken)
  )
    return true;
  const all = Object.values(signals).join(" ");
  if (unsafe.some((term) => containsPhrase(normalizeSignal(all), term)))
    return true;
  return false;
}
export function matchPersonalField(signals: PersonalSignals): PersonalMatch {
  if (isBlockedSignals(signals)) return { score: 0, ambiguous: false };
  const label = keys(signals.label),
    name = keys(signals.name),
    id = keys(signals.id),
    placeholder = keys(signals.placeholder);
  const token = signals.autocomplete.trim().split(/\s+/).at(-1) ?? "";
  const autoKey = auto[token];
  const found = new Set([
    ...label,
    ...name,
    ...id,
    ...placeholder,
    ...(autoKey ? [autoKey] : []),
  ]);
  if (found.size > 1) return { score: 0, ambiguous: true };
  // Explicit but unknown labels outrank weak technical names. Avoid third-party contact fields.
  if (signals.label.trim() && !label.length)
    return { score: 0, ambiguous: false };
  const key = [...found][0];
  if (!key) return { score: 0, ambiguous: false };
  return {
    key,
    score: autoKey ? 98 : label.length ? 95 : 90,
    ambiguous: false,
  };
}
const facts = new Set([
  "fullName",
  "firstName",
  "lastName",
  "mother",
  "father",
  "address",
  "complement",
  "city",
  "state",
  "country",
  "issuer",
]);
export function valueForPersonalField(
  key: string,
  answer: AnswerValue,
  type: string,
  language: Language,
  question?: string,
): string | undefined {
  if (key === "salaryExpectation")
    return answer.type === "salary" &&
      answer.currency === "BRL" &&
      answer.period === "month" &&
      ["text", "number"].includes(type) &&
      !!question &&
      salaryPrompt(question)
      ? String(answer.value)
      : undefined;
  if (
    answer.type === "long-text" ||
    answer.type === "boolean" ||
    answer.type === "multiple-choice" ||
    answer.type === "salary"
  )
    return undefined;
  if (key === "email" && answer.type !== "email") return undefined;
  if (key === "phone" && answer.type !== "phone") return undefined;
  if (
    ["linkedin", "github", "portfolio"].includes(key) &&
    answer.type !== "url"
  )
    return undefined;
  if (
    ["javaYears", "sqlYears"].includes(key) &&
    !["number", "experience-years"].includes(answer.type)
  )
    return undefined;
  if (
    ![
      "email",
      "phone",
      "birthDate",
      "linkedin",
      "linked in",
      "linked in url",
      "linked in profile",
      "perfil linked in",
      "github",
      "portfolio",
      "javaYears",
      "sqlYears",
    ].includes(key) &&
    !["text", "single-choice"].includes(answer.type)
  )
    return undefined;
  if (type === "tel" && answer.type !== "phone") return undefined;
  if (key === "birthDate" && type !== "date") return undefined;
  if (type === "date" && answer.type !== "date") return undefined;
  if (type === "email" && answer.type !== "email") return undefined;
  if (type === "url" && answer.type !== "url") return undefined;
  if (
    type === "number" &&
    answer.type !== "number" &&
    answer.type !== "experience-years"
  )
    return undefined;
  if (answer.type === "text")
    return (
      answer.value[language] ??
      (facts.has(key) ? (answer.value["pt-BR"] ?? answer.value.en) : undefined)
    );
  if (answer.type === "date" && type !== "date") return undefined;
  return String(answer.value);
}
export const personalKeys = Object.keys(aliases);
