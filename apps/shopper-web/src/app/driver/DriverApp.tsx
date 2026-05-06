import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import {
  commitDriverBatchScan,
  listDriverManifest,
  pushDriverLocation,
  type DriverManifestOrder,
} from "../../services/logisticsApi";

const queueStorageKey = "united-pharmacies-driver-queue";

function createSessionId() {
  return crypto.randomUUID();
}

function readQueue() {
  try {
    const raw = localStorage.getItem(queueStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DriverApp() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DriverManifestOrder[]>([]);
  const [queuedScans, setQueuedScans] = useState<Array<{ code: string; scanned_at: string }>>([]);
  const [scanInput, setScanInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [sessionId, setSessionId] = useState(createSessionId);
  const [selectedOrderId, setSelectedOrderId] = useState("");

  useEffect(() => {
    setQueuedScans(readQueue());
  }, []);

  useEffect(() => {
    localStorage.setItem(queueStorageKey, JSON.stringify(queuedScans));
  }, [queuedScans]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let active = true;

    async function load() {
      try {
        const manifest = await listDriverManifest(user.id);

        if (active) {
          setOrders(manifest);
          setSelectedOrderId((current) => current || manifest[0]?.id || "");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load your manifest.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const summary = useMemo(
    () => ({
      ready: orders.filter((order) => order.status === "ready_for_dispatch").length,
      out: orders.filter((order) => order.status === "out_for_delivery").length,
      queued: queuedScans.length,
    }),
    [orders, queuedScans.length],
  );

  function queueScan(code: string) {
    const trimmed = code.trim();

    if (!trimmed) {
      return;
    }

    setQueuedScans((current) => {
      if (current.some((entry) => entry.code === trimmed)) {
        return current;
      }

      return [
        ...current,
        {
          code: trimmed,
          scanned_at: new Date().toISOString(),
        },
      ];
    });
    setScanInput("");
  }

  async function commitQueue() {
    if (!queuedScans.length) {
      return;
    }

    setCommitting(true);

    try {
      const result = await commitDriverBatchScan({
        session_id: sessionId,
        device_id: navigator.userAgent.slice(0, 120),
        scans: queuedScans,
      });

      setQueuedScans([]);
      setSessionId(createSessionId());
      toast.success(`Committed ${result.updated.length} scan(s).`);

      if (user?.id) {
        setOrders(await listDriverManifest(user.id));
      }

      if (result.rejected.length) {
        toast.message(`${result.rejected.length} scan(s) were rejected.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to commit scans.");
    } finally {
      setCommitting(false);
    }
  }

  async function shareLocation() {
    if (!user?.id || !selectedOrderId) {
      toast.error("Select an active order first.");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation is not available on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await pushDriverLocation({
            driver_id: user.id,
            order_id: selectedOrderId,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy_meters: position.coords.accuracy,
            heading: position.coords.heading ?? undefined,
            speed_kmh:
              typeof position.coords.speed === "number"
                ? Math.max(position.coords.speed, 0) * 3.6
                : undefined,
            captured_at: new Date(position.timestamp).toISOString(),
          });

          toast.success("Location shared.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to share location.");
        }
      },
      () => toast.error("Location permission is required to share progress."),
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 10_000,
      },
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-600">Driver App</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Scan-first route workspace</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Scans stay queued until Supabase confirms them. That keeps offline behavior explicit instead of pretending a delivery state succeeded locally.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <MetricCard label="Ready" value={summary.ready} />
          <MetricCard label="Out now" value={summary.out} />
          <MetricCard label="Queued offline" value={summary.queued} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">Today&apos;s manifest</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Only assigned orders are visible to the driver profile.</p>
            </div>
            <button
              type="button"
              onClick={() => void commitQueue()}
              disabled={!queuedScans.length || committing}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {committing ? "Committing…" : `Commit ${queuedScans.length}`}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-[1.4rem] border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                Loading manifest…
              </div>
            ) : !orders.length ? (
              <div className="rounded-[1.4rem] border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                No active assignments yet.
              </div>
            ) : (
              orders.map((order) => (
                <label
                  key={order.id}
                  className={`block rounded-[1.4rem] border p-4 transition ${
                    selectedOrderId === order.id
                      ? "border-teal-300 bg-teal-50/60"
                      : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="selected-order"
                      value={order.id}
                      checked={selectedOrderId === order.id}
                      onChange={() => setSelectedOrderId(order.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                            {order.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-black text-slate-950">{order.customer_name}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-600" dir="ltr">
                        {order.customer_phone}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        Token: {order.qr_token}
                      </p>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Flash scan queue</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Camera integration can push into the same queue. For now the shell accepts QR tokens or order IDs and deduplicates them locally.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                value={scanInput}
                onChange={(event) => setScanInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    queueScan(scanInput);
                  }
                }}
                placeholder="Paste or scan order QR token"
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
              />
              <button
                type="button"
                onClick={() => queueScan(scanInput)}
                className="rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
              >
                Queue
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {queuedScans.length ? (
                queuedScans.map((entry) => (
                  <div key={entry.code} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{entry.code}</p>
                      <p className="text-xs font-semibold text-slate-500">{entry.scanned_at}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setQueuedScans((current) => current.filter((item) => item.code !== entry.code))
                      }
                      className="text-xs font-black text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  No queued scans yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Location sharing</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              This sends a single trusted location update through the Supabase function for the selected order.
            </p>
            <button
              type="button"
              onClick={() => void shareLocation()}
              className="mt-4 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-black text-white"
            >
              Share current location
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 px-4 py-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
