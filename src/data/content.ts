import { CalendarDays, CircleDollarSign, IdCard, MapPin, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { asset } from "@/lib/asset";

export const navItems = [
  { label: "Come funziona", href: "#come-funziona" },
  { label: "Tessera", href: "#tessera" },
  { label: "Partner", href: "#partner" },
  { label: "Eventi", href: "#eventi" },
  { label: "Community", href: "#community" },
];

export const stats = [
  { label: "Iscritti attivi", value: 3500, suffix: "+", icon: UsersRound },
  { label: "Partner e convenzioni", value: 48, suffix: "+", icon: CircleDollarSign },
  { label: "Eventi in calendario", value: 16, suffix: "", icon: CalendarDays },
  { label: "Costo tessera", value: 0, suffix: " euro", icon: IdCard },
];

export const steps = [
  {
    title: "Registrati",
    copy: "Crea il profilo gratuito in pochi minuti e ricevi l'accesso alla piattaforma.",
    icon: ShieldCheck,
  },
  {
    title: "Ricevi la tessera",
    copy: "La Sponky Card digitale diventa il tuo pass per partner, eventi e vantaggi.",
    icon: IdCard,
  },
  {
    title: "Risparmia e guida",
    copy: "Scopri sconti, punti di ritrovo, uscite in pista e nuove persone con cui macinare strada.",
    icon: Sparkles,
  },
];

export const partnerCategories = ["Tutti", "Moto care", "Accessori", "Food", "Pista", "Community", "Servizi"];

export const partners = [
  {
    name: "Synt Chemical",
    category: "Moto care",
    location: "Zola Predosa",
    offer: "Promo dedicata moto e auto",
    tone: "from-orange-500/30 to-cyan-400/10",
  },
  {
    name: "AGMOTO by Accossato",
    category: "Accessori",
    location: "Villastellone, Torino",
    offer: "10% su tutto il listino",
    tone: "from-red-500/30 to-orange-400/10",
  },
  {
    name: "Spiller - Forst",
    category: "Food",
    location: "Italia",
    offer: "Menu e serate ufficiali Sponky",
    tone: "from-lime-300/20 to-orange-400/10",
  },
  {
    name: "DBK Special Parts",
    category: "Accessori",
    location: "Castel Maggiore, BO",
    offer: "Componenti speciali e promo",
    tone: "from-cyan-400/25 to-red-500/10",
  },
  {
    name: "Caschi per il Cuore",
    category: "Community",
    location: "Imola",
    offer: "Media partner e iniziative solidali",
    tone: "from-red-400/25 to-cyan-400/10",
  },
  {
    name: "#23 Riders Academy",
    category: "Pista",
    location: "Brescia",
    offer: "Academy, tecnica e track day",
    tone: "from-orange-500/30 to-red-500/10",
  },
  {
    name: "Kromis Elite Care",
    category: "Moto care",
    location: "Milano",
    offer: "Luxury moto care per la tua moto",
    tone: "from-cyan-400/25 to-white/5",
  },
  {
    name: "Roadsitalia",
    category: "Accessori",
    location: "Leffe, BG",
    offer: "Roads Protection Plus dedicata",
    tone: "from-orange-400/25 to-cyan-400/10",
  },
  {
    name: "RaceSeats",
    category: "Servizi",
    location: "Rho",
    offer: "Soluzioni racing su misura",
    tone: "from-red-500/25 to-white/5",
  },
];

export const events = [
  {
    title: "Neon Ride Milano",
    date: "2026-10-25T20:30:00+02:00",
    place: "Milano",
    tag: "Night ride",
    seats: 82,
    description: "Un giro serale tra luci urbane, pit stop partner e arrivo social.",
  },
  {
    title: "Cisa Brotherhood Run",
    date: "2026-11-08T09:00:00+01:00",
    place: "Passo della Cisa",
    tag: "Motogiro",
    seats: 120,
    description: "Curve, colazione condivisa e pranzo convenzionato per la squad.",
  },
  {
    title: "Track Pulse Cremona",
    date: "2026-12-06T08:30:00+01:00",
    place: "Cremona Circuit",
    tag: "Pista",
    seats: 48,
    description: "Briefing tecnico, turni in pista e contenuti foto/video per gli iscritti.",
  },
];

export const communityShots = [
  {
    title: "Night Pack",
    label: "Ride urbano",
    src: asset("/assets/community-night-ride.svg"),
  },
  {
    title: "Track Day",
    label: "Cremona Circuit",
    src: asset("/assets/community-track-day.svg"),
  },
  {
    title: "Meet Point",
    label: "Partner ufficiali",
    src: asset("/assets/community-meet.svg"),
  },
  {
    title: "Road Story",
    label: "Dolomiti",
    src: asset("/assets/community-road.svg"),
  },
];

export const testimonials = [
  {
    quote: "Con la tessera ho scoperto officine e locali che non conoscevo. La parte bella e' che agli eventi arrivi gia' tra amici.",
    author: "Marco R.",
    bike: "Yamaha MT-09",
  },
  {
    quote: "Mi sono iscritta per gli sconti, sono rimasta per i giri. Community vera, zero frizione inutile.",
    author: "Giulia F.",
    bike: "Ducati Monster",
  },
  {
    quote: "Finalmente un posto unico per convenzioni, calendario e contatti. Sembra piccolo, ma ti cambia il weekend.",
    author: "Andrea P.",
    bike: "BMW R nineT",
  },
];

export const faqs = [
  {
    question: "L'iscrizione e' davvero gratuita?",
    answer:
      "Si. La logica e' free signup: ti registri, ricevi la tessera digitale e puoi consultare convenzioni, partner ed eventi disponibili.",
  },
  {
    question: "Come uso la tessera digitale?",
    answer:
      "Mostri la Sponky Card al partner convenzionato o usi il codice indicato nella scheda partner. Ogni convenzione specifica le condizioni.",
  },
  {
    question: "Posso proporre un evento o un partner?",
    answer:
      "Si. La community cresce con gruppi locali, aziende e rider. Il form finale raccoglie anche richieste partner e idee evento.",
  },
  {
    question: "Il sito sara' pronto per aggiungere login e profili?",
    answer:
      "La struttura e' gia' modulare: dati, sezioni, form e componenti sono separati per collegare in seguito API, CRM o area utente.",
  },
];

export const footerLinks = [
  { label: "Instagram", href: "https://www.instagram.com/sponkysquad/" },
  { label: "Facebook", href: "https://www.facebook.com/" },
  { label: "Diventa partner", href: "#iscrizione" },
  { label: "Note legali", href: "#footer" },
];

/**
 * Marker della mappa. `x`/`y` valgono sul layout largo; `cx`/`cy` sono la
 * versione compatta per finestre strette: l'Italia e' solo ~314px larga e
 * con le coordinate normali Torino, Milano e Bologna si sovrappongono.
 */
export const mapHighlights = [
  { label: "Milano", x: "37.8%", y: "22.5%", cx: "34%", cy: "13%" },
  { label: "Bologna", x: "45.6%", y: "30%", cx: "62%", cy: "33%" },
  { label: "Roma", x: "49.8%", y: "49.9%", cx: "54%", cy: "60%" },
  { label: "Sardegna", x: "37.4%", y: "64.1%", cx: "8%", cy: "70%" },
  { label: "Torino", x: "26.5%", y: "26%", cx: "8%", cy: "14%" },
];

export { MapPin };
