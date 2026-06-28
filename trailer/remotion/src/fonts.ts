import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";

const { fontFamily: antonFamily } = loadAnton();
const { fontFamily: archivoFamily } = loadArchivo();

export const fontDisplay = antonFamily;
export const fontUi = archivoFamily;
