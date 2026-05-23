/**
 * Substitute `{propertyName}` templates in text with values from args.
 *
 * Example: "Hello {name}!" with args={name:"Forge"} → "Hello Forge!"
 */
export function substituteTemplates(text: string, args: Record<string, unknown>): string {
  return text.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    if (key in args) {
      return String(args[key]);
    }
    return `{${key}}`;
  });
}
