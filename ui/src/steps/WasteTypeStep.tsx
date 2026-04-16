import { useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { WasteTypesRequest } from '../api/schemas';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

export type WasteSelection = {
  heavyWaste: boolean;
  plasterboard: boolean;
  plasterboardOption: 'under_10' | '10_to_25' | 'over_25' | null;
};

type Props = {
  initial?: WasteSelection;
  onBack: () => void;
  onContinue: (selection: WasteSelection) => void;
};

const HANDLING_OPTIONS: { value: NonNullable<WasteSelection['plasterboardOption']>; label: string }[] = [
  { value: 'under_10',  label: 'Under 10% of load' },
  { value: '10_to_25',  label: '10–25% of load' },
  { value: 'over_25',   label: 'Over 25% of load' },
];

export function WasteTypeStep({ initial, onBack, onContinue }: Props) {
  const [general, setGeneral] = useState<boolean>(initial ? !initial.heavyWaste && !initial.plasterboard : false);
  const [heavyWaste, setHeavyWaste] = useState<boolean>(initial?.heavyWaste ?? false);
  const [plasterboard, setPlasterboard] = useState<boolean>(initial?.plasterboard ?? false);
  const [plasterboardOption, setPlasterboardOption] =
    useState<WasteSelection['plasterboardOption']>(initial?.plasterboardOption ?? null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  // If user unticks plasterboard, clear the option so it doesn't bleed into the payload.
  function handlePlasterboardToggle(next: boolean) {
    setPlasterboard(next);
    if (!next) setPlasterboardOption(null);
    setValidation(null);
  }

  // Selecting general waste is mutually exclusive with heavy + plasterboard in the UI;
  // the API payload still uses booleans so the flags still go as false.
  function handleGeneralToggle(next: boolean) {
    setGeneral(next);
    if (next) {
      setHeavyWaste(false);
      setPlasterboard(false);
      setPlasterboardOption(null);
    }
    setValidation(null);
  }

  function handlePlasterboardOption(value: NonNullable<WasteSelection['plasterboardOption']>) {
    setPlasterboardOption(value);
    setValidation(null);
  }

  async function handleSubmit() {
    setValidation(null);
    if (!general && !heavyWaste && !plasterboard) {
      setValidation('Select at least one waste type to continue.');
      return;
    }
    if (plasterboard && plasterboardOption === null) {
      setValidation('Choose how much plasterboard is in your load.');
      return;
    }

    const payload: WasteTypesRequest = {
      heavyWaste,
      plasterboard,
      plasterboardOption: plasterboard ? plasterboardOption : null,
    };

    inFlight.current?.abort();
    const ac = new AbortController();
    inFlight.current = ac;

    setSubmitting(true);
    setError(null);

    try {
      await api.submitWasteTypes(payload, ac.signal);
      if (ac.signal.aborted) return;
      onContinue({
        heavyWaste,
        plasterboard,
        plasterboardOption: plasterboard ? plasterboardOption : null,
      });
    } catch (err) {
      if (ac.signal.aborted) return;
      setError(
        err instanceof ApiError && err.status >= 500
          ? 'We couldn\'t save your selection. Please try again.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="step2-heading" className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">Step 2 of 4</p>
        <h1 id="step2-heading" className="text-2xl font-semibold mt-1">
          What type of waste are you disposing of?
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Select all that apply. Heavy waste may limit skip sizes.
        </p>
      </header>

      <fieldset className="space-y-3" data-testid="waste-type-list">
        <legend className="sr-only">Waste types</legend>

        <label
          className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-slate-50 ${
            general ? 'border-brand-600 bg-brand-50' : 'border-slate-300'
          }`}
          data-testid="waste-general"
        >
          <input
            type="checkbox"
            className="mt-1"
            checked={general}
            onChange={(e) => handleGeneralToggle(e.target.checked)}
            aria-describedby="general-desc"
          />
          <span>
            <span className="block font-medium">General waste</span>
            <span id="general-desc" className="block text-sm text-slate-600">
              Household / garden / light commercial waste.
            </span>
          </span>
        </label>

        <label
          className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-slate-50 ${
            heavyWaste ? 'border-brand-600 bg-brand-50' : 'border-slate-300'
          }`}
          data-testid="waste-heavy"
        >
          <input
            type="checkbox"
            className="mt-1"
            checked={heavyWaste}
            onChange={(e) => {
              setHeavyWaste(e.target.checked);
              if (e.target.checked) setGeneral(false);
              setValidation(null);
            }}
            aria-describedby="heavy-desc"
          />
          <span>
            <span className="block font-medium">Heavy waste</span>
            <span id="heavy-desc" className="block text-sm text-slate-600">
              Soil, rubble, concrete, bricks. Limits available skip sizes.
            </span>
          </span>
        </label>

        <label
          className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-slate-50 ${
            plasterboard ? 'border-brand-600 bg-brand-50' : 'border-slate-300'
          }`}
          data-testid="waste-plasterboard"
        >
          <input
            type="checkbox"
            className="mt-1"
            checked={plasterboard}
            onChange={(e) => {
              handlePlasterboardToggle(e.target.checked);
              if (e.target.checked) setGeneral(false);
            }}
            aria-describedby="plasterboard-desc"
          />
          <span>
            <span className="block font-medium">Plasterboard</span>
            <span id="plasterboard-desc" className="block text-sm text-slate-600">
              Requires separate handling — choose a percentage below.
            </span>
          </span>
        </label>
      </fieldset>

      {plasterboard && (
        <fieldset
          className="space-y-2 rounded-md border border-slate-300 bg-slate-50 p-4"
          data-testid="plasterboard-options"
        >
          <legend className="text-sm font-medium px-1">Plasterboard handling</legend>
          {HANDLING_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 cursor-pointer"
              data-testid={`plasterboard-${opt.value}`}
            >
              <input
                type="radio"
                name="plasterboardOption"
                value={opt.value}
                checked={plasterboardOption === opt.value}
                onChange={() => handlePlasterboardOption(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      {validation && (
        <p role="alert" className="text-sm text-red-700" data-testid="waste-validation">
          {validation}
        </p>
      )}

      {submitting && <Spinner label="Saving" />}

      {error && (
        <Alert
          variant="error"
          title="Couldn't save selection"
          actions={
            <Button type="button" variant="secondary" onClick={handleSubmit} data-testid="waste-retry">
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onBack} data-testid="waste-back">
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          data-testid="waste-continue"
        >
          Continue
        </Button>
      </div>
    </section>
  );
}
