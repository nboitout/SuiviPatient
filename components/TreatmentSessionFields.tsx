"use client";

import { useState } from "react";
import { INTENSITIES, SIDES, SITES } from "@/lib/registry";
import { Field, SelectOptions } from "./RegistryFields";

const newZone = (key: number) => ({
  key,
  site: "podal",
  zoneLabel: "",
  side: "gauche",
  technique: "",
  intensity: "non_evaluee",
  durationSeconds: "",
  findingsBefore: "",
  findingsAfter: "",
});
type ZoneDraft = ReturnType<typeof newZone>;

export default function TreatmentSessionFields({
  nextIndex = 1,
  today,
  protocolVersion = "protocole-v1.0",
}: {
  nextIndex?: number;
  today: string;
  protocolVersion?: string;
}) {
  const [session, setSession] = useState({
    sessionIndex: nextIndex,
    performedAt: today,
    protocolVersion,
    atlasVersion: "",
    durationMinutes: "",
    deviations: "",
    immediateResponse: "",
    concurrentCareChanges: "",
  });
  const [zones, setZones] = useState<ZoneDraft[]>([newZone(0)]);
  const [nextKey, setNextKey] = useState(1);
  function updateZone(
    key: number,
    field: keyof Omit<ZoneDraft, "key">,
    value: string,
  ) {
    setZones((current) =>
      current.map((zone) =>
        zone.key === key ? { ...zone, [field]: value } : zone,
      ),
    );
  }
  function move(index: number, delta: number) {
    setZones((current) => {
      const next = [...current];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  return (
    <fieldset className="registry-section">
      <legend>Séance réalisée</legend>
      <p className="muted">
        Décrivez les gestes effectués. L’ordre des zones correspond à l’ordre de
        traitement.
      </p>
      <input
        type="hidden"
        name="session"
        value={JSON.stringify({ ...session, zones })}
      />
      <div className="form-grid">
        <Field id="sessionIndex" label="Numéro dans cet épisode *">
          <input
            id="sessionIndex"
            type="number"
            min={1}
            max={1000}
            required
            value={session.sessionIndex}
            onChange={(e) =>
              setSession({ ...session, sessionIndex: Number(e.target.value) })
            }
          />
        </Field>
        <Field id="performedAt" label="Date de séance *">
          <input
            id="performedAt"
            type="date"
            required
            max={today}
            value={session.performedAt}
            onChange={(e) =>
              setSession({ ...session, performedAt: e.target.value })
            }
          />
        </Field>
        <Field id="durationMinutes" label="Durée totale (minutes) *">
          <input
            id="durationMinutes"
            type="number"
            required
            min={1}
            max={240}
            value={session.durationMinutes}
            onChange={(e) =>
              setSession({ ...session, durationMinutes: e.target.value })
            }
          />
        </Field>
        <Field id="protocolVersion" label="Protocole / version appliquée *">
          <input
            id="protocolVersion"
            required
            maxLength={100}
            value={session.protocolVersion}
            onChange={(e) =>
              setSession({ ...session, protocolVersion: e.target.value })
            }
          />
        </Field>
      </div>
      <Field
        id="atlasVersion"
        label="Cartographie utilisée : ouvrage, édition ou version"
        help="Renseignez la référence utilisée, si applicable, pour conserver les mêmes repères dans le temps."
      >
        <input
          id="atlasVersion"
          maxLength={160}
          value={session.atlasVersion}
          onChange={(e) =>
            setSession({ ...session, atlasVersion: e.target.value })
          }
        />
      </Field>
      {zones.map((zone, index) => (
        <fieldset className="zone-card" key={zone.key}>
          <legend>Zone {index + 1}</legend>
          <div className="form-grid">
            <Field id={`site-${zone.key}`} label="Site *">
              <select
                id={`site-${zone.key}`}
                value={zone.site}
                onChange={(e) => updateZone(zone.key, "site", e.target.value)}
              >
                <SelectOptions options={SITES} />
              </select>
            </Field>
            <Field id={`side-${zone.key}`} label="Côté *">
              <select
                id={`side-${zone.key}`}
                value={zone.side}
                onChange={(e) => updateZone(zone.key, "side", e.target.value)}
              >
                <SelectOptions options={SIDES} />
              </select>
            </Field>
            <Field
              id={`zone-${zone.key}`}
              label="Zone ROP / repère anatomique *"
            >
              <input
                id={`zone-${zone.key}`}
                required
                maxLength={160}
                value={zone.zoneLabel}
                onChange={(e) =>
                  updateZone(zone.key, "zoneLabel", e.target.value)
                }
              />
            </Field>
            <Field
              id={`technique-${zone.key}`}
              label="Geste / technique utilisée *"
            >
              <input
                id={`technique-${zone.key}`}
                required
                maxLength={160}
                value={zone.technique}
                onChange={(e) =>
                  updateZone(zone.key, "technique", e.target.value)
                }
              />
            </Field>
            <Field id={`intensity-${zone.key}`} label="Intensité observée">
              <select
                id={`intensity-${zone.key}`}
                value={zone.intensity}
                onChange={(e) =>
                  updateZone(zone.key, "intensity", e.target.value)
                }
              >
                <SelectOptions options={INTENSITIES} />
              </select>
            </Field>
            <Field
              id={`duration-${zone.key}`}
              label="Durée sur cette zone (secondes)"
            >
              <input
                id={`duration-${zone.key}`}
                type="number"
                min={1}
                max={14400}
                value={zone.durationSeconds}
                onChange={(e) =>
                  updateZone(zone.key, "durationSeconds", e.target.value)
                }
              />
            </Field>
            <Field
              id={`before-${zone.key}`}
              label="Observation tissulaire avant"
            >
              <textarea
                id={`before-${zone.key}`}
                maxLength={500}
                value={zone.findingsBefore}
                onChange={(e) =>
                  updateZone(zone.key, "findingsBefore", e.target.value)
                }
              />
            </Field>
            <Field
              id={`after-${zone.key}`}
              label="Observation tissulaire après"
            >
              <textarea
                id={`after-${zone.key}`}
                maxLength={500}
                value={zone.findingsAfter}
                onChange={(e) =>
                  updateZone(zone.key, "findingsAfter", e.target.value)
                }
              />
            </Field>
          </div>
          <div className="action-row">
            <button
              className="btn btn-secondary btn-small"
              type="button"
              disabled={index === 0}
              aria-label={`Monter la zone ${index + 1}`}
              onClick={() => move(index, -1)}
            >
              Monter
            </button>
            <button
              className="btn btn-secondary btn-small"
              type="button"
              disabled={index === zones.length - 1}
              aria-label={`Descendre la zone ${index + 1}`}
              onClick={() => move(index, 1)}
            >
              Descendre
            </button>
            <button
              className="btn btn-secondary btn-small"
              type="button"
              disabled={zones.length === 1}
              aria-label={`Retirer la zone ${index + 1}`}
              onClick={() => setZones(zones.filter((z) => z.key !== zone.key))}
            >
              Retirer
            </button>
          </div>
        </fieldset>
      ))}
      <button
        className="btn btn-secondary"
        type="button"
        disabled={zones.length >= 20}
        onClick={() => {
          setZones([...zones, newZone(nextKey)]);
          setNextKey(nextKey + 1);
        }}
      >
        Ajouter une zone
      </button>
      <div className="form-grid registry-following">
        <Field id="deviations" label="Adaptations du protocole et raisons">
          <textarea
            id="deviations"
            maxLength={1000}
            value={session.deviations}
            onChange={(e) =>
              setSession({ ...session, deviations: e.target.value })
            }
          />
        </Field>
        <Field
          id="immediateResponse"
          label="Ressenti immédiat rapporté au praticien"
        >
          <textarea
            id="immediateResponse"
            maxLength={1000}
            value={session.immediateResponse}
            onChange={(e) =>
              setSession({ ...session, immediateResponse: e.target.value })
            }
          />
        </Field>
      </div>
      <Field
        id="concurrentCareChanges"
        label="Changements des autres traitements depuis la séance précédente"
      >
        <textarea
          id="concurrentCareChanges"
          maxLength={1000}
          value={session.concurrentCareChanges}
          onChange={(e) =>
            setSession({ ...session, concurrentCareChanges: e.target.value })
          }
        />
      </Field>
    </fieldset>
  );
}
