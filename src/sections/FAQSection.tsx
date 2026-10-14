import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SectionHeader } from "@/components/SectionHeader";
import { faqs } from "@/data/content";

export function FAQSection() {
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
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
