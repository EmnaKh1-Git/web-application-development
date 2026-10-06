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

export function AdminComplaintsPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [response, setResponse] = useState('');
  const [nextStatus, setNextStatus] = useState('IN_PROGRESS');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    try {
      setItems((await complaintsApi.all(status ? { status } : {})).data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  useEffect(() => {
    let cancelled = false;
    const fetchComplaints = async () => {
      try {
        const result = await complaintsApi.all(status ? { status } : {});
        if (!cancelled) setItems(result.data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    };
    fetchComplaints();
    return () => {
      cancelled = true;
    };
  }, [status]);
  const handle = async (event) => {
    event.preventDefault();
    try {
      await complaintsApi.handle(selected.id, { status: nextStatus, adminResponse: response });
      setSelected(null);
      setResponse('');
      setMessage('Réclamation mise à jour.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Traitement des réclamations</h1>
        <p className="mt-1 text-slate-600">Répondez aux clients et mettez à jour le statut.</p>
      </div>
      {error && (
        <Alert variant="error" title="Erreur">
          {error}
        </Alert>
      )}
      {message && <Alert variant="success">{message}</Alert>}
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="rounded-lg px-3 py-2 ring-1 ring-slate-300"
      >
        <option value="">Tous les statuts</option>
        {Object.entries(labels).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <div className="space-y-3">
        {items.length === 0 ? (
          <Alert title="Aucune réclamation">Aucune réclamation dans ce filtre.</Alert>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="font-semibold">
                  #{item.id} — {item.subject}
                </h2>
                <span className="text-sm text-brand-700">{labels[item.status]}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {item.customer?.firstName} {item.customer?.lastName} · {item.customer?.email}
              </p>
              <p className="mt-2">{item.description}</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSelected(item);
                  setNextStatus(item.status);
                  setResponse(item.adminResponse ?? '');
                }}
              >
                Traiter
              </Button>
            </article>
          ))
        )}
      </div>
      {selected && (
        <form
          onSubmit={handle}
          className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200"
        >
          <h2 className="text-lg font-semibold">Répondre à #{selected.id}</h2>
          <select
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value)}
            className="rounded-lg px-3 py-2 ring-1 ring-slate-300"
          >
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <TextField
            label="Réponse au client"
            value={response}
            onChange={(event) => setResponse(event.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit">Enregistrer</Button>
            <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
