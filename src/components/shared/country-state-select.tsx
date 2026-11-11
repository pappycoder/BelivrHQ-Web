"use client";

/**
 * @file Country + dependent State select fields backed by `country-state-city`.
 * Values are stored as human-readable names ("Nigeria", "Lagos") to match
 * existing DB rows; the library is only used to derive valid options.
 * The state field auto-clears itself when its sibling country changes and the
 * current value is no longer valid for that country.
 */

import * as React from "react";
import {
  useFormContext,
  useWatch,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Country, State } from "country-state-city";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CountryOption {
  name: string;
  iso: string;
}

const COUNTRIES: CountryOption[] = (Country.getAllCountries() ?? [])
  .map((c) => ({ name: c.name, iso: c.isoCode }))
  .sort((a, b) => a.name.localeCompare(b.name));

const ISO_BY_NAME = new Map(
  COUNTRIES.map((c) => [c.name.toLowerCase(), c.iso])
);

/** Valid state/province names for a stored country name (empty if unknown). */
export function getStateOptions(countryName?: string): string[] {
  if (!countryName) return [];
  const iso = ISO_BY_NAME.get(countryName.toLowerCase());
  if (!iso) return [];
  return (State.getStatesOfCountry(iso) ?? [])
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b));
}

type Variant = "default" | "info";

function itemClassName(variant: Variant): string {
  return variant === "info"
    ? "grid items-start gap-2 [&+&]:mt-5"
    : "space-y-2";
}

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Matches the stacked spacing used by settings fields. */
  variant?: Variant;
}

export function CountrySelectField<T extends FieldValues>({
  control,
  name,
  label = "Country",
  placeholder = "Select country",
  disabled,
  variant = "default",
}: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={itemClassName(variant)}>
          <FormLabel>{label}</FormLabel>
          <div className="min-w-0">
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-72">
                {(field.value &&
                !COUNTRIES.some(
                  (c) => c.name.toLowerCase() === field.value?.toLowerCase()
                )
                  ? [{ name: field.value, iso: "" }, ...COUNTRIES]
                  : COUNTRIES
                ).map((country) => (
                  <SelectItem key={country.iso || country.name} value={country.name}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

interface StateFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  /** Path of the sibling country field this state list depends on. */
  countryName: Path<T>;
}

export function StateSelectField<T extends FieldValues>({
  control,
  name,
  countryName,
  label = "State",
  placeholder = "Select state",
  disabled,
  variant = "default",
}: StateFieldProps<T>) {
  const form = useFormContext<FieldValues>();
  const country = useWatch({ control, name: countryName }) as string | undefined;

  // Clear an invalid state when the chosen country changes (not on first mount).
  const prevCountry = React.useRef(country);
  React.useEffect(() => {
    if (prevCountry.current === country) return;
    prevCountry.current = country;
    const current = form.getValues(name as string);
    if (current && !getStateOptions(country).includes(current)) {
      form.setValue(name as string, "", { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  const states = React.useMemo(() => getStateOptions(country), [country]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={itemClassName(variant)}>
          <FormLabel>{label}</FormLabel>
          <div className="min-w-0">
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              disabled={disabled || !states.length}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      states.length ? placeholder : "Select country first"
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-72">
                {(
                  field.value && !states.includes(field.value)
                    ? [field.value, ...states]
                    : states
                ).map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
