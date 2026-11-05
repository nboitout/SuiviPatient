"use client";

import { startTransition, useActionState, type FormEvent } from "react";

// Keep long forms intact when a server validation error is returned.
// Native React action forms reset uncontrolled fields even on returned errors.
export function useRegistryForm<State>(
  action: (state: Awaited<State>, form: FormData) => Promise<Awaited<State>>,
  initial: Awaited<State>,
) {
  const [state, dispatch, pending] = useActionState<State, FormData>(
    action,
    initial,
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => dispatch(form));
  }
  return { state, submit, pending };
}
