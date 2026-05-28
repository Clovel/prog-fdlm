/* Framework imports ----------------------------------- */

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* md tagged template function ------------------------- */
/**
 * Identity-shape tagged template for markdown strings. Concatenates the
 * template parts and stringified interpolated values, returning the raw
 * markdown text. Editors and tooling that recognize the \`md\` tag can
 * provide markdown-aware syntax highlighting on tagged strings while the
 * runtime cost stays nil.
 */
type Interpolable = string | number | boolean | null | undefined;

export const md = (
  strings: TemplateStringsArray,
  ...values: Interpolable[]
): string => {
  return strings.reduce<string>(
    (acc, str, i) => {
      const value = values[i];
      const stringified = value === undefined || value === null ? '' : String(value);
      return acc + str + stringified;
    },
    '',
  );
};

export const markdown = md;
