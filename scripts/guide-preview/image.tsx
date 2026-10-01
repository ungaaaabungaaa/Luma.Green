import type { ImageProps } from "next/image";

/** Local Vite URLs replace Next's optimizer only in synthetic guide captures. */
export default function GuideImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  className,
  style,
}: ImageProps) {
  const image = typeof src !== "string" && "default" in src ? src.default : src;
  const url = typeof image === "string" ? image : image.src;
  const dimensions = typeof image === "string" ? undefined : image;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Vite has no Next optimizer; this adapter is restricted to documentation fixtures.
    <img
      src={url}
      alt={alt}
      width={fill ? undefined : (width ?? dimensions?.width)}
      height={fill ? undefined : (height ?? dimensions?.height)}
      sizes={sizes}
      className={className}
      style={
        fill
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              ...style,
            }
          : style
      }
    />
  );
}
