import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getRegistryDomain, getAppCandidates } from "../utils/image";

interface ContainerIconProps {
  imageRepo: string;
  containerName: string;
  size?: "sm" | "lg";
}

export function ContainerIcon({ imageRepo, containerName, size = "sm" }: ContainerIconProps) {
  const { t } = useTranslation();
  const domain = getRegistryDomain(imageRepo);
  const sizeClasses =
    size === "lg"
      ? {
          wrapper: "h-14 w-14 rounded-2xl",
          image: "h-10 w-10",
          fallbackText: "text-xl",
        }
      : {
          wrapper: "h-8 w-8 rounded-lg",
          image: "h-6 w-6",
          fallbackText: "text-sm",
        };

  const [idx, setIdx] = useState(0);
  const [useFavicon, setUseFavicon] = useState(false);
  const [failedAll, setFailedAll] = useState(false);

  const candidates = useMemo(
    () => getAppCandidates(imageRepo, containerName),
    [imageRepo, containerName],
  );

  const current = candidates[idx];

  if (failedAll) {
    return (
      <div
        className={`${sizeClasses.wrapper} bg-slate-100 flex items-center justify-center`}
        title={t("containers.iconFallbackTitle")}
        aria-label={t("containers.iconFallbackAriaLabel")}
      >
        <span className={sizeClasses.fallbackText}>🐳</span>
      </div>
    );
  }

  if (useFavicon || !current) {
    const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      domain,
    )}&sz=64`;

    return (
      <div
        className={`${sizeClasses.wrapper} bg-slate-100 flex items-center justify-center overflow-hidden`}
      >
        <img
          src={src}
          alt={t("containers.registryAlt", { container: containerName })}
          className={sizeClasses.image}
          title={domain}
          onError={() => setFailedAll(true)}
        />
      </div>
    );
  }

  const siSrc = `https://cdn.simpleicons.org/${encodeURIComponent(current)}`;

  return (
    <div
      className={`${sizeClasses.wrapper} bg-slate-100 flex items-center justify-center overflow-hidden`}
    >
      <img
        src={siSrc}
        alt={t("containers.iconAlt", { container: containerName })}
        className={sizeClasses.image}
        title={`simpleicons: ${current}`}
        onError={() => {
          if (idx + 1 < candidates.length) setIdx(idx + 1);
          else setUseFavicon(true);
        }}
      />
    </div>
  );
}
