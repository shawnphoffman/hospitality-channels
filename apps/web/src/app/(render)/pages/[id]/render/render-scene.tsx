"use client";

interface RenderSceneProps {
  templateSlug: string;
  data: Record<string, string>;
  room: { name: string } | null;
}

export function RenderScene({ templateSlug, data, room }: RenderSceneProps) {
  return (
    <div style={{ width: 1920, height: 1080, overflow: "hidden" }}>
      {templateSlug === "welcome" && <WelcomeScene data={data} room={room} />}
      {templateSlug === "house-guide" && <HouseGuideScene data={data} />}
    </div>
  );
}

function WelcomeScene({
  data,
  room,
}: {
  data: Record<string, string>;
  room: { name: string } | null;
}) {
  const guestName = data.guestName || "Guest";
  const welcomeMessage = data.welcomeMessage || "Welcome to your home away from home!";
  const wifiSsid = data.wifiSsid;
  const wifiPassword = data.wifiPassword;
  const arrivalDate = data.arrivalDate;
  const departureDate = data.departureDate;

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center text-white"
      style={{ background: "linear-gradient(to bottom right, #0f172a, #1e293b, #1e1b4b)" }}
    >
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          top: -160,
          height: 600,
          width: 800,
          opacity: 0.2,
          filter: "blur(120px)",
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
        }}
      />

      {room && (
        <p style={{ fontSize: 22, letterSpacing: "0.3em" }} className="mb-4 uppercase text-slate-400">
          {room.name}
        </p>
      )}

      <h1 style={{ fontSize: 42 }} className="relative z-10 mb-6 text-center font-light leading-tight text-slate-300">
        {welcomeMessage}
      </h1>

      <p style={{ fontSize: 96 }} className="relative z-10 mb-10 text-center font-bold leading-none tracking-tight">
        {guestName}
      </p>

      {(arrivalDate || departureDate) && (
        <p style={{ fontSize: 28 }} className="relative z-10 mb-12 text-slate-400">
          {arrivalDate}
          {arrivalDate && departureDate ? "  —  " : ""}
          {departureDate}
        </p>
      )}

      {wifiSsid && (
        <div
          className="relative z-10 rounded-2xl border border-slate-700/60 bg-slate-800/60 text-center backdrop-blur-sm"
          style={{ padding: "32px 64px" }}
        >
          <p style={{ fontSize: 20, letterSpacing: "0.2em" }} className="mb-2 uppercase text-slate-400">
            Wi-Fi
          </p>
          <p style={{ fontSize: 36 }} className="font-semibold">{wifiSsid}</p>
          {wifiPassword && (
            <p style={{ fontSize: 28 }} className="mt-2 font-light text-slate-300">
              {wifiPassword}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function HouseGuideScene({ data }: { data: Record<string, string> }) {
  const items: Array<{ label: string; value: string }> = [];

  if (data.wifiSsid) items.push({ label: "Wi-Fi Network", value: data.wifiSsid });
  if (data.wifiPassword) items.push({ label: "Wi-Fi Password", value: data.wifiPassword });
  if (data.checkoutTime) items.push({ label: "Checkout Time", value: data.checkoutTime });
  if (data.quietHours) items.push({ label: "Quiet Hours", value: data.quietHours });
  if (data.parkingInfo) items.push({ label: "Parking", value: data.parkingInfo });
  if (data.thermostatInstructions) items.push({ label: "Thermostat", value: data.thermostatInstructions });
  if (data.kitchenNotes) items.push({ label: "Kitchen & Amenities", value: data.kitchenNotes });

  return (
    <div
      className="flex h-full w-full flex-col text-white"
      style={{ background: "linear-gradient(to bottom, #0f172a, #020617)" }}
    >
      <div className="flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
        <h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">House Guide</h1>
      </div>

      <div className="mx-auto mt-6 rounded-full bg-indigo-500" style={{ height: 3, width: 120 }} />

      <div style={{ padding: "50px 96px 60px" }} className="flex-1">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p style={{ fontSize: 32 }} className="text-slate-500">No house info configured yet.</p>
          </div>
        ) : (
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: items.length > 3 ? "1fr 1fr" : "1fr",
              gap: "32px 64px",
            }}
          >
            {items.map((item) => (
              <div
                key={item.label}
                className="flex flex-col justify-center rounded-2xl border border-slate-800 bg-slate-800/40"
                style={{ padding: "32px 40px" }}
              >
                <p style={{ fontSize: 20, letterSpacing: "0.15em" }} className="uppercase text-slate-400">
                  {item.label}
                </p>
                <p style={{ fontSize: 36 }} className="mt-3 font-semibold leading-snug">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
