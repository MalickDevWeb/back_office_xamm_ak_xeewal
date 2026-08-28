// Simulate a validation schema (e.g., using Zod in a real project)
export const LoginSchema = {
  validate(data: any) {
    const errors: string[] = [];
    if (!data.email || typeof data.email !== 'string') {
      errors.push('L\'email est invalide ou manquant.');
    }
    if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères.');
    }
    return {
      success: errors.length === 0,
      errors
    };
  }
};
