import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SectionHeader } from "@/components/SectionHeader";
import { faqs as staticFaqs } from "@/data/content";
import { api, type ContentFaq } from "@/lib/api";
import { LinkedText } from "@/lib/linkify";

/**
 * Domande prima di partire.
 *
 * Le domande arrivano dall'API (le gestisce la dashboard admin). Se l'API non
 * risponde — o non c'e' ancora nulla di pubblicato — si mostrano quelle
 * scritte in `content.ts`, cosi' la sezione non resta mai vuota.
 */
export function FAQSection() {
  const [remote, setRemote] = useState<ContentFaq[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .content()
      .then((data) => {
        if (alive) setRemote(data.faqs);
      })
      .catch(() => {
        /* offline o API non raggiungibile: resta il contenuto statico */
      });
    return () => {
      alive = false;
    };
  }, []);

  const items =
    remote && remote.length > 0
      ? remote.map((faq) => ({ key: faq.id, question: faq.question, answer: faq.answer }))
      : staticFaqs.map((faq, index) => ({ key: `static-${index}`, question: faq.question, answer: faq.answer }));

  return (
    <section className="section-shell bg-asphalt-900">
      <div className="container grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <SectionHeader
          eyebrow="FAQ"
          title="Domande prima di partire"
          copy="Risposte essenziali sui punti chiave: iscrizione gratuita, tessera, partner e futura scalabilita' della piattaforma."
        />

        <div data-reveal className="glass-panel rounded-lg px-6">
          <Accordion type="single" collapsible defaultValue="item-0">
            {items.map((item, index) => (
              <AccordionItem key={item.key} value={`item-${index}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>
                  <LinkedText text={item.answer} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
