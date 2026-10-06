import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@smart-ecommerce/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useAuth } from '@/shared/auth/useAuth';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { TextField } from '@/shared/components/ui/TextField';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { AuthCard } from '../components/AuthCard';

export function LoginPage() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema), // mêmes règles de validation que le Back-End
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await login(values);
      // Redirection automatique par <GuestRoute> dès que la session est ouverte.
    } catch (error) {
      if (!applyServerValidationErrors(error, setError)) {
        setServerError(error.message);
      }
    }
  };

  return (
    <AuthCard
      title="Connexion"
      subtitle={
        <>
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Créer un compte
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && <Alert variant="error">{serverError}</Alert>}
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Se connecter
        </Button>
      </form>
    </AuthCard>
  );
}
