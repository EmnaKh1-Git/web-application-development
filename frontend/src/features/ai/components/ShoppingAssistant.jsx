import { ORDER_STATUS_LABELS } from '@smart-ecommerce/shared';
import { useMutation } from '@tanstack/react-query';
import { Bot, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/shared/auth/useAuth';
import { ProductImage } from '@/shared/components/ProductImage';
import { Spinner } from '@/shared/components/ui/Spinner';
import { cn } from '@/shared/utils/cn';
import { formatPrice } from '@/shared/utils/format';
import { aiApi } from '../api/aiApi';
import { AiBadge } from './AiBadge';

const MAX_HISTORY = 12;
const WELCOME_SUGGESTIONS = [
  'Un cadeau pour ma sœur à moins de 150 DT',
  'Les meilleurs écouteurs',
  'Où en est ma commande ?',
  'Comment se passe la livraison ?',
];

/** Derniers messages envoyés à l'API : la conversation doit commencer par le client. */
function toApiMessages(messages) {
  const conversation = messages
    .filter((message) => !message.isLocal)
    .map(({ role, content }) => ({ role, content }))
    .slice(-MAX_HISTORY);
  const firstUser = conversation.findIndex((message) => message.role === 'user');
  return conversation.slice(firstUser);
}

/** Assistant d'achat conversationnel (bouton flottant présent sur toutes les pages de la boutique). */
export function ShoppingAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      isLocal: true,
      content:
        'Bonjour ! Je suis l’assistant de SmartE-Commerce. Je peux vous trouver un produit selon votre budget, proposer une idée cadeau ou vous donner le suivi de vos commandes.',
      suggestions: WELCOME_SUGGESTIONS,
    },
  ]);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const chat = useMutation({
    mutationFn: aiApi.assistant,
    onSuccess: (answer) =>
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: answer.reply,
          products: answer.products,
          orders: answer.orders,
          suggestions: answer.suggestions,
          source: answer.source,
        },
      ]),
    onError: (error) =>
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          isLocal: true,
          content: `Désolé, je n’ai pas pu répondre : ${error.message}`,
        },
      ]),
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chat.isPending]);

  useEffect(() => {
    if (!isOpen) return undefined;
    inputRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const send = (content) => {
    const message = content.trim();
    if (!message || chat.isPending) return;
    const next = [...messages, { role: 'user', content: message }];
    setMessages(next);
    setText('');
    chat.mutate(toApiMessages(next));
  };

  const lastAssistant = messages.findLastIndex((message) => message.role === 'assistant');

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-brand-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:right-6 sm:bottom-6"
        >
          <Bot aria-hidden="true" className="size-5" />
          Assistant IA
        </button>
      )}

      {isOpen && (
        <section
          role="dialog"
          aria-label="Assistant d’achat"
          className="fixed right-4 bottom-4 z-40 flex h-[min(620px,calc(100vh-2rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:right-6 sm:bottom-6"
        >
          <header className="flex items-center justify-between gap-2 bg-linear-to-r from-brand-600 to-violet-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/15">
                <Bot aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Assistant SmartE</p>
                <p className="text-xs text-white/80">
                  {user ? `Bonjour ${user.firstName}` : 'Recherche, cadeaux, suivi de commande'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1.5 hover:bg-white/15"
            >
              <X aria-hidden="true" className="size-5" />
              <span className="sr-only">Fermer l’assistant</span>
            </button>
          </header>

          <div
            ref={listRef}
            aria-live="polite"
            className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex flex-col gap-2', message.role === 'user' && 'items-end')}
              >
                <p
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line',
                    message.role === 'user'
                      ? 'rounded-br-sm bg-brand-600 text-white'
                      : 'rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200',
                  )}
                >
                  {message.content}
                </p>
                {message.products?.length > 0 && (
                  <ul className="grid w-full gap-2">
                    {message.products.map((product) => (
                      <li key={product.id}>
                        <Link
                          to={`/products/${product.id}`}
                          className="flex items-center gap-3 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 hover:ring-brand-300"
                        >
                          <ProductImage
                            src={product.imageUrl}
                            name={product.name}
                            compact
                            className="size-12 shrink-0 rounded-lg"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-sm font-medium">{product.name}</span>
                            <span className="text-xs text-slate-500">{product.category?.name}</span>
                          </span>
                          <span className="text-sm font-semibold">
                            {formatPrice(product.price)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {message.orders?.length > 0 && (
                  <ul className="flex w-full flex-wrap gap-2">
                    {message.orders.map((order) => (
                      <li key={order.id}>
                        <Link
                          to={`/orders/${order.id}`}
                          className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
                        >
                          N°{order.id} · {ORDER_STATUS_LABELS[order.status]}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {message.source && <AiBadge source={message.source} label="Réponse IA" />}
                {index === lastAssistant && !chat.isPending && message.suggestions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {message.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => send(suggestion)}
                        className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chat.isPending && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" />
                L’assistant réfléchit…
              </p>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(text);
            }}
            className="flex items-center gap-2 border-t border-slate-200 p-3"
          >
            <label className="sr-only" htmlFor="assistant-message">
              Votre message
            </label>
            <input
              ref={inputRef}
              id="assistant-message"
              value={text}
              maxLength={1000}
              onChange={(event) => setText(event.target.value)}
              placeholder="Ex. : une robe à moins de 100 DT"
              className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!text.trim() || chat.isPending}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Send aria-hidden="true" className="size-4" />
              <span className="sr-only">Envoyer</span>
            </button>
          </form>
        </section>
      )}
    </>
  );
}
