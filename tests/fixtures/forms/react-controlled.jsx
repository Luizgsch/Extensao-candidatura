import React, { useState } from "react";
import { createRoot } from "react-dom/client";
function Controlled() {
  const [name, setName] = useState("");
  return (
    <label>
      Nome completo
      <input
        id="react-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <output id="react-state">{name}</output>
    </label>
  );
}
createRoot(document.getElementById("react-root")).render(<Controlled />);
