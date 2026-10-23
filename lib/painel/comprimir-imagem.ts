/**
 * Reduz a foto no próprio navegador antes de enviar (fotos de celular passam de 5 MB).
 * Lado maior até `maximo` px, em WebP. Se o navegador não conseguir, devolve o arquivo original.
 */
export async function comprimirImagem(arquivo: File, maximo = 1600): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
    if (!blob || blob.type !== "image/webp") return arquivo;
    return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return arquivo;
  }
}
