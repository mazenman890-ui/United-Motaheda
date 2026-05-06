export const workflowEventNames = {
  CartUpdated: "CartUpdated",
  LocationResolved: "LocationResolved",
  AssignmentRecomputed: "AssignmentRecomputed",
  QuoteRefreshed: "QuoteRefreshed",
  OrderSubmitted: "OrderSubmitted",
  PrescriptionUploaded: "PrescriptionUploaded",
  PrescriptionReviewed: "PrescriptionReviewed",
  CourierStatusUpdated: "CourierStatusUpdated",
} as const;

export type WorkflowEventName =
  (typeof workflowEventNames)[keyof typeof workflowEventNames];

export type WorkflowEventPayload = Record<string, unknown>;

export type WorkflowEvent = {
  name: WorkflowEventName;
  payload?: WorkflowEventPayload;
  timestamp: string;
};

type WorkflowListener = (event: WorkflowEvent) => void;

const listeners = new Set<WorkflowListener>();

export function emitWorkflowEvent(
  name: WorkflowEventName,
  payload?: WorkflowEventPayload,
) {
  const event: WorkflowEvent = {
    name,
    payload,
    timestamp: new Date().toISOString(),
  };

  for (const listener of listeners) {
    listener(event);
  }

  if (typeof console !== "undefined") {
    console.info(`[workflow] ${name}`, payload ?? {});
  }
}

export function subscribeToWorkflowEvents(listener: WorkflowListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
