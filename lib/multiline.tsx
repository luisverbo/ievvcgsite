import { Fragment } from "react";

// Renderiza texto com quebras de linha (\n vira <br/>).
export function multiline(text: string) {
  return text.split("\n").map((linha, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {linha}
    </Fragment>
  ));
}
