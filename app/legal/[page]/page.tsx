import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/contact";

// Placeholders until a Panamanian lawyer drafts the final texts.
const PAGES: Record<string, { title: string; body: string[] }> = {
  terminos: { title: "Términos y condiciones", body: [
    "Monta es una plataforma que permite a organizadores vender entradas y a compradores adquirirlas.",
    "Monta actúa como agente de cobro del organizador. El organizador es responsable del evento, su realización y su contenido.",
    "El comprador paga un cargo por servicio que se muestra antes de pagar. La política de reembolso la define cada organizador y aparece en la página del evento.",
    `Para dudas sobre una compra o un evento, escríbenos a ${CONTACT_EMAIL}.`,
    "Este texto es provisional y será reemplazado por los términos definitivos.",
  ] },
  privacidad: { title: "Política de privacidad", body: [
    "Usamos tus datos (nombre, correo, teléfono y los que el evento requiera) para emitir y enviarte tus entradas, y los compartimos con el organizador del evento.",
    `No vendemos tus datos. Puedes pedir que los borremos escribiendo a ${CONTACT_EMAIL}.`,
    "Este texto es provisional y será reemplazado por la política definitiva.",
  ] },
  cookies: { title: "Cookies", body: [
    "Usamos cookies necesarias para mantener tu sesión, tu idioma y tu tema. No usamos cookies de publicidad.",
  ] },
};

export const generateStaticParams = () => Object.keys(PAGES).map((page) => ({ page }));

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const p = PAGES[(await params).page];
  return p ? { title: p.title } : {};
}

export default async function Legal({ params }: { params: Promise<{ page: string }> }) {
  const p = PAGES[(await params).page];
  if (!p) notFound();
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display font-extrabold text-3xl">{p.title}</h1>
      <div className="mt-6 grid gap-4 text-sub leading-relaxed">{p.body.map((x, i) => <p key={i}>{x}</p>)}</div>
    </article>
  );
}
