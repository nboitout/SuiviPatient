"use client";

import { useActionState } from "react";
import { regenerateLinkAction, type RegenerateLinkState } from "@/app/praticien/actions";

export default function RegenerateLink({ episodeId }: { episodeId: string }) {
  const [state, formAction, pending] = useActionState<RegenerateLinkState>(
    regenerateLinkAction.bind(null, episodeId),
    {}
  );

  return (
    <div style={{ marginTop: 12 }}>
      {state.link ? (
        <div>
          <p className="notice notice-info" style={{ wordBreak: "break-all" }}>
            Nouveau lien (l&apos;ancien est révoqué) : {state.link}
          </p>
          {state.qrDataUrl && (
            <p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.qrDataUrl} alt="QR code du nouveau lien patient" width={220} height={220} />
            </p>
          )}
        </div>
      ) : (
        <form action={formAction} style={{ display: "inline" }}>
          <button className="btn btn-secondary btn-small" type="submit" disabled={pending}>
            {pending ? "Génération…" : "Régénérer le lien / QR patient"}
          </button>
          {state.error && <span className="field-error"> {state.error}</span>}
        </form>
      )}
      <p className="field-help">
        À utiliser si le patient a perdu son lien ou demande un renvoi. L&apos;action est
        journalisée et l&apos;ancien lien cesse de fonctionner immédiatement.
      </p>
    </div>
  );
}
