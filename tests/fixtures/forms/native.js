window.submissions = 0;
window.inputEvents = 0;
window.changeEvents = 0;
document.querySelector("#application").addEventListener("submit", (e) => {
  e.preventDefault();
  window.submissions++;
});
document.addEventListener("input", () => window.inputEvents++);
document.addEventListener("change", () => window.changeEvents++);
document
  .querySelector("#masked-phone")
  .addEventListener(
    "input",
    (e) => (e.target.value = e.target.value.replace(/\D/g, "")),
  );
document
  .querySelector("#rejected-city")
  .addEventListener("input", (e) => (e.target.value = ""));
document.querySelector("#add-field").onclick = () => {
  const label = document.createElement("label");
  label.textContent = "GitHub";
  const input = document.createElement("input");
  input.type = "url";
  input.id = "github";
  label.append(input);
  document.querySelector("#dynamic").append(label);
};
