export interface MediaPreset {
  id: string;
  label: string;
  url: string;
}

export const playerAvatarPresets: MediaPreset[] = [
  {
    id: "ze-trovao",
    label: "Zé Trovão",
    url: "/presets/players/ze-trovao.svg",
  },
  { id: "magrao", label: "Magrão", url: "/presets/players/magrao.svg" },
  { id: "biscoito", label: "Biscoito", url: "/presets/players/biscoito.svg" },
  { id: "russo", label: "Russo", url: "/presets/players/russo.svg" },
  { id: "te-doido", label: "Tê Doido", url: "/presets/players/te-doido.svg" },
  { id: "nanico", label: "Nanico", url: "/presets/players/nanico.svg" },
  { id: "parca", label: "Parca", url: "/presets/players/parca.svg" },
  { id: "leo-mao", label: "Léo & Mão", url: "/presets/players/leo-mao.svg" },
];

export const groupLogoPresets: MediaPreset[] = [
  {
    id: "pimbas-trampo",
    label: "Pimbas do Trampo",
    url: "/presets/groups/pimbas-trampo.svg",
  },
];
