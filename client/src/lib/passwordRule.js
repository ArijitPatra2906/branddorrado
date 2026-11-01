// Same rule the server enforces (server/src/routes/auth.js): at least 6 characters with an uppercase letter, a lowercase letter, a digit and a special character.
export const PASSWORD_HINT = 'At least 6 characters, with an uppercase letter, a lowercase letter, a number and a special character.';
export function passwordProblem(pw) {
    if (pw.length < 6) return 'Use at least 6 characters.';
    if (!/[a-z]/.test(pw)) return 'Add a lowercase letter.';
    if (!/[A-Z]/.test(pw)) return 'Add an uppercase letter.';
    if (!/\d/.test(pw)) return 'Add a number.';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Add a special character, such as ! or @.';
    return '';
}
