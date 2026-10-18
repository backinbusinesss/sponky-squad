import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const signupSchema = z.object({
  name: z.string().min(2, "Inserisci almeno 2 caratteri."),
  email: z.string().email("Inserisci una email valida."),
  city: z.string().min(2, "Indica la tua citta'."),
  bike: z.string().min(2, "Dicci che moto guidi."),
  message: z.string().max(420, "Massimo 420 caratteri.").optional(),
  privacy: z.boolean().refine(Boolean, "Devi accettare il trattamento dati."),
});

type SignupValues = z.infer<typeof signupSchema>;

export function FinalCTASection() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      privacy: false,
    },
  });

  function onSubmit(values: SignupValues) {
    console.info("Sponky signup payload", values);
    setSubmitted(true);
    reset();
  }

  return (
    <section id="iscrizione" className="section-shell relative overflow-hidden bg-asphalt-950">
      <div className="absolute inset-0 bg-radial-neon opacity-72" />
      <div className="container relative grid gap-12 lg:grid-cols-[.88fr_1.12fr] lg:items-center">
        <div data-reveal>
          <p className="text-sm font-extrabold uppercase tracking-normal text-racing-cyan">CTA finale</p>
          <h2 className="mt-4 font-display text-6xl uppercase leading-[0.86] text-white neon-text sm:text-8xl">
            Entra nella Squad
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
            Iscriviti gratis, ricevi la tessera digitale e resta aggiornato su convenzioni, partner ed eventi. Il form e' pronto per
            essere collegato a CRM, email marketing o API proprietaria.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-white/62">
            {["Tessera digitale gratuita", "Partner e promo selezionate", "Eventi e networking tra biker"].map((item) => (
              <p key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-racing-orange" />
                {item}
              </p>
            ))}
          </div>
        </div>

        <form data-reveal className="glass-panel rounded-lg p-5 sm:p-7" onSubmit={handleSubmit(onSubmit)} noValidate>
          {submitted ? (
            <div className="mb-5 rounded-lg border border-racing-cyan/35 bg-racing-cyan/10 p-4 text-sm font-semibold text-racing-cyan">
              Richiesta registrata. In produzione qui parte l'integrazione con backend o CRM.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-white/46">Nome</span>
              <Input placeholder="Mario Rossi" {...register("name")} />
              {errors.name ? <span className="text-xs text-racing-red">{errors.name.message}</span> : null}
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-white/46">Email</span>
              <Input type="email" placeholder="mario@email.it" {...register("email")} />
              {errors.email ? <span className="text-xs text-racing-red">{errors.email.message}</span> : null}
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-white/46">Citta'</span>
              <Input placeholder="Milano" {...register("city")} />
              {errors.city ? <span className="text-xs text-racing-red">{errors.city.message}</span> : null}
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-white/46">Moto</span>
              <Input placeholder="Ducati Monster" {...register("bike")} />
              {errors.bike ? <span className="text-xs text-racing-red">{errors.bike.message}</span> : null}
            </label>
          </div>

          <label className="mt-4 grid gap-2">
            <span className="text-xs font-bold uppercase text-white/46">Messaggio</span>
            <Textarea placeholder="Vorrei ricevere la tessera e restare aggiornato sugli eventi." {...register("message")} />
            {errors.message ? <span className="text-xs text-racing-red">{errors.message.message}</span> : null}
          </label>

          <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-white/62">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 accent-racing-orange"
              {...register("privacy")}
            />
            <span>Accetto il trattamento dei dati per ricevere comunicazioni Sponky Squad.</span>
          </label>
          {errors.privacy ? <span className="mt-2 block text-xs text-racing-red">{errors.privacy.message}</span> : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              <Send className="h-4 w-4" />
              Iscriviti gratis
            </Button>
            <a
              href="mailto:info@sponkysquad.it"
              className="selectable inline-flex items-center gap-2 py-2.5 text-sm font-bold text-white/58 hover:text-white"
            >
              <Mail className="h-4 w-4" />
              info@sponkysquad.it
            </a>
          </div>
        </form>
      </div>
    </section>
  );
}
