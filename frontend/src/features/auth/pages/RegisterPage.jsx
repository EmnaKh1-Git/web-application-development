import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MIN_LENGTH, registerSchema, z } from '@smart-ecommerce/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useAuth } from '@/shared/auth/useAuth';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { TextField } from '@/shared/components/ui/TextField';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { AuthCard } from '../components/AuthCard';

// Schéma partagé avec le Back-End + confirmation du mot de passe (propre au formulaire).
const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les mots de passe ne correspondent pas',
  });

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ confirmPassword: _confirmPassword, ...payload }) => {
    setServerError(null);
    try {
      await registerAccount(payload);
      // Redirection automatique par <GuestRoute> dès que la session est ouverte.
    } catch (error) {
      if (!applyServerValidationErrors(error, setError)) {
        setServerError(error.message);
      }
    }
  };

  return (
    <AuthCard
      title="Créer un compte"
      subtitle={
        <>
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Se connecter
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Prénom"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <TextField
            label="Nom"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères, avec une majuscule, une minuscule et un chiffre.`}
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Créer mon compte
        </Button>
      </form>
    </AuthCard>
  );
}
