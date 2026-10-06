import { useEffect, useState } from 'react';
import { complaintsApi } from '../api/complaintsApi';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { TextField } from '@/shared/components/ui/TextField';

const labels = {
  OPEN: 'Ouverte',
  IN_PROGRESS: 'En traitement',
  RESOLVED: 'Résolue',
  REJECTED: 'Rejetée',
};

export function ComplaintsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ subject: '', description: '', orderId: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    try {
      setItems((await complaintsApi.mine()).data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  useEffect(() => {
    let cancelled = false;
    const fetchComplaints = async () => {
      try {
        const response = await complaintsApi.mine();
        if (!cancelled) setItems(response.data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    };
    fetchComplaints();
    return () => {
      cancelled = true;
    };
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    try {
      await complaintsApi.create({ ...form, orderId: form.orderId || undefined });
      setForm({ subject: '', description: '', orderId: '' });
      setMessage('Votre réclamation a été envoyée.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes réclamations</h1>
        <p className="mt-1 text-slate-600">Signalez un problème et suivez sa résolution.</p>
      </div>
      {error && (
        <Alert variant="error" title="Erreur">
          {error}
        </Alert>
      )}
      {message && <Alert variant="success">{message}</Alert>}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <h2 className="text-lg font-semibold">Déposer une réclamation</h2>
        <TextField
          label="Objet"
          minLength="5"
          value={form.subject}
          onChange={(event) => setForm({ ...form, subject: event.target.value })}
          required
        />
        <TextField
          label="Numéro de commande (facultatif)"
          type="number"
          min="1"
          value={form.orderId}
          onChange={(event) => setForm({ ...form, orderId: event.target.value })}
        />
        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea
            required
            minLength="20"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="mt-1.5 block min-h-32 w-full rounded-lg px-3 py-2 ring-1 ring-slate-300"
          />
        </label>
        <Button type="submit">Envoyer la réclamation</Button>
      </form>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historique</h2>
        {items.length === 0 ? (
          <Alert title="Aucune réclamation">Vous n'avez pas encore déposé de réclamation.</Alert>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">
                  #{item.id} — {item.subject}
                </h3>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                  {labels[item.status] ?? item.status}
                </span>
              </div>
              <p className="mt-2 text-slate-600">{item.description}</p>
              {item.orderId && (
                <p className="mt-2 text-sm text-slate-500">Commande #{item.orderId}</p>
              )}
              {item.adminResponse && (
                <Alert className="mt-3" variant="info" title="Réponse de l'équipe">
                  {item.adminResponse}
                </Alert>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
