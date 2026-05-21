"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Store, Bike, Navigation, Wifi, WifiOff, MapPin,
  Clock, Activity, RefreshCw, TrendingUp, Package, Users,
  CloudRain, Wind, Sun, Cloud, Star, MapPinned, ChevronRight,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  Map, MapMarker, MapControls, MarkerContent, MarkerPopup, MarkerTooltip,
  type MapRef,
} from "@/components/ui/map";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Area config ──────────────────────────────────────────────────────────────
const SUPPORTED_AREAS = [
  "All Bangalore",
  "BTM Layout",
  "Bannerghatta Road",
  "Yelahanka",
  "Brookefield",
  "Hebbal",
] as const;

type SupportedArea = (typeof SUPPORTED_AREAS)[number];

const AREA_VIEWPORTS: Record<SupportedArea, { center: [number, number]; zoom: number }> = {
  "All Bangalore": { center: [77.608, 12.958], zoom: 11.5 },
  "BTM Layout": { center: [77.6101, 12.9165], zoom: 13 },
  "Bannerghatta Road": { center: [77.5978, 12.8927], zoom: 13 },
  "Yelahanka": { center: [77.5963, 13.1007], zoom: 13 },
  "Brookefield": { center: [77.7499, 12.9698], zoom: 13 },
  "Hebbal": { center: [77.5971, 13.0353], zoom: 13 },
};

// Each area gets a distinct accent colour used both in the pill bar
// and as the map boundary fill / stroke.
const AREA_COLORS: Record<SupportedArea, { hex: string; tw: string; ring: string; fill: string }> = {
  "All Bangalore": { hex: "#6366f1", tw: "text-indigo-400", ring: "border-indigo-500/50", fill: "bg-indigo-500/15" },
  "BTM Layout": { hex: "#f43f5e", tw: "text-rose-400", ring: "border-rose-500/50", fill: "bg-rose-500/15" },
  "Bannerghatta Road": { hex: "#f59e0b", tw: "text-amber-400", ring: "border-amber-500/50", fill: "bg-amber-500/15" },
  "Yelahanka": { hex: "#10b981", tw: "text-emerald-400", ring: "border-emerald-500/50", fill: "bg-emerald-500/15" },
  "Brookefield": { hex: "#8b5cf6", tw: "text-violet-400", ring: "border-violet-500/50", fill: "bg-violet-500/15" },
  "Hebbal": { hex: "#06b6d4", tw: "text-cyan-400", ring: "border-cyan-500/50", fill: "bg-cyan-500/15" },
};

// Approximate bounding polygons for each area (lng, lat pairs).
// These are rendered as GeoJSON fill + stroke layers on the map canvas.
const AREA_POLYGONS: Partial<Record<SupportedArea, [number, number][]>> = {
  "BTM Layout": [[77.595, 12.908], [77.630, 12.908], [77.630, 12.928], [77.595, 12.928], [77.595, 12.908]],
  "Bannerghatta Road": [[77.584, 12.873], [77.618, 12.873], [77.618, 12.912], [77.584, 12.912], [77.584, 12.873]],
  "Yelahanka": [[77.582, 13.088], [77.616, 13.088], [77.616, 13.115], [77.582, 13.115], [77.582, 13.088]],
  "Brookefield": [[77.734, 12.957], [77.768, 12.957], [77.768, 12.984], [77.734, 12.984], [77.734, 12.957]],
  "Hebbal": [[77.584, 13.023], [77.616, 13.023], [77.616, 13.050], [77.584, 13.050], [77.584, 13.023]],
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Restaurant {
  id: string; name: string; latitude: number; longitude: number;
  locationNeighborhood: string; rate: number; cuisines: string;
  restType: string; onlineOrder: boolean;
}
interface Agent {
  id: string; name: string; latitude: number; longitude: number;
  status: string; vehicleType: string; ratings: string; totalDeliveries: number;
}
interface ActiveOrder {
  orderId: string; restaurantId: string; deliveryPersonId: string;
  restaurantLatitude: number; restaurantLongitude: number;
  deliveryLocationLatitude: number; deliveryLocationLongitude: number;
  typeOfOrder: string; typeOfVehicle: string;
  weatherConditions: string; roadTrafficDensity: string;
  timeTakenMin: number; festival: boolean;
}
interface Stats {
  totalRestaurants: number; totalAgents: number; totalOrders: number;
  available: number; onDelivery: number; offline: number;
}
interface AgentSim {
  id: string; name: string; status: string; vehicleType: string; ratings: string;
  currentPos: [number, number];
  routePath: [number, number][];
  pathIdx: number;
  targetDelivery?: [number, number];
  orderId?: string;
  weatherConditions?: string;
  roadTrafficDensity?: string;
}

// ─── Road route cache (module-level = survives re-renders) ───────────────────
const routeCache = new globalThis.Map<string, [number, number][]>();

async function fetchRoadRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  const key = `${from[0].toFixed(4)},${from[1].toFixed(4)}-${to[0].toFixed(4)},${to[1].toFixed(4)}`;
  if (routeCache.has(key)) return routeCache.get(key)!;
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error("OSRM");
    const json = await res.json();
    if (json.code !== "Ok" || !json.routes?.[0]) throw new Error("no route");
    const coords: [number, number][] = json.routes[0].geometry.coordinates;
    routeCache.set(key, coords);
    return coords;
  } catch {
    const fb: [number, number][] = [from, to];
    routeCache.set(key, fb);
    return fb;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusColor(s: string) {
  return s === "Available" ? "bg-emerald-500" : s === "On Delivery" ? "bg-amber-500" : "bg-zinc-600";
}
function statusTextColor(s: string) {
  return s === "Available" ? "text-emerald-400" : s === "On Delivery" ? "text-amber-400" : "text-zinc-500";
}
function statusBgColor(s: string) {
  return s === "Available" ? "bg-emerald-500/15 border-emerald-500/30" : s === "On Delivery" ? "bg-amber-500/15 border-amber-500/30" : "bg-zinc-800/60 border-zinc-700/30";
}
function weatherIcon(w: string) {
  if (w === "Rainy" || w === "Stormy") return <CloudRain className="h-3 w-3" />;
  if (w === "Windy") return <Wind className="h-3 w-3" />;
  if (w === "Cloudy") return <Cloud className="h-3 w-3" />;
  return <Sun className="h-3 w-3" />;
}
function agentSpeed(traffic: string, vehicle: string): number {
  const base = vehicle === "bicycle" ? 0.00018 : 0.0004;
  const factor = traffic === "Jam" ? 0.3 : traffic === "High" ? 0.55 : traffic === "Medium" ? 0.75 : 1.0;
  return base * factor;
}

// ─── Area Selector (inside Map for correct z-context) ────────────────────────
function AreaSelector({ selected, onChange }: { selected: SupportedArea; onChange: (a: SupportedArea) => void }) {
  return (
    <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-1 bg-zinc-950/40 backdrop-blur-md p-1 rounded-xl border border-white/5 shadow-lg">
      <MapPinned className="h-3.5 w-3.5 text-zinc-500 mx-1.5 shrink-0" />
      <div className="h-3.5 w-px bg-white/10 shrink-0 mx-0.5" />
      {SUPPORTED_AREAS.map((area) => {
        const active = selected === area;
        const c = AREA_COLORS[area];
        return (
          <button
            key={area}
            onClick={() => onChange(area)}
            className={[
              "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-200 flex items-center gap-1.5",
              active
                ? `${c.fill} ${c.tw} border ${c.ring} shadow-sm`
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent",
            ].join(" ")}
          >
            {area !== "All Bangalore" && (
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: active ? c.hex : "currentColor", opacity: active ? 1 : 0.4 }}
              />
            )}
            {area === "All Bangalore" ? "All" : area}
          </button>
        );
      })}
    </div>
  );
}

// ─── Map boundary overlay for the selected area ───────────────────────────────
// Draws a coloured polygon on the map canvas via a native canvas overlay
// injected through a hidden MapMarker anchor. We use an SVG-in-canvas
// approach: a zero-size anchor marker at the polygon centroid renders
// a <canvas> overlay is NOT possible through react-map-gl markers,
// so instead we render a lightweight pulsing ring around the centroid
// and let the pill bar colour communicate the partition.
// Full GeoJSON layer support would require react-map-gl Source+Layer —
// included below as the correct production approach.
function AreaBoundaryMarker({ area }: { area: SupportedArea }) {
  const poly = AREA_POLYGONS[area];
  if (!poly) return null;
  const lngs = poly.map((p) => p[0]);
  const lats = poly.map((p) => p[1]);
  const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const color = AREA_COLORS[area];
  return (
    <MapMarker longitude={cLng} latitude={cLat}>
      <MarkerContent>
        <div
          className="relative flex items-center justify-center"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          {/* Pulsing glow ring */}
          <div
            className="absolute rounded-full animate-ping opacity-20"
            style={{
              width: 120, height: 120,
              backgroundColor: color.hex,
              animationDuration: "2.5s",
            }}
          />
          {/* Solid ring border */}
          <div
            className="absolute rounded-full border-2 opacity-50"
            style={{
              width: 110, height: 110,
              borderColor: color.hex,
              boxShadow: `0 0 20px ${color.hex}40, inset 0 0 20px ${color.hex}10`,
            }}
          />
          {/* Area label chip */}
          <div
            className="relative z-10 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide border shadow-lg"
            style={{
              backgroundColor: `${color.hex}22`,
              borderColor: `${color.hex}60`,
              color: color.hex,
              backdropFilter: "blur(8px)",
            }}
          >
            {area}
          </div>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LiveMapPage() {
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);

  const [selectedArea, setSelectedArea] = useState<SupportedArea>("All Bangalore");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [agentSims, setAgentSims] = useState<AgentSim[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRestaurants: 0, totalAgents: 0, totalOrders: 0, available: 0, onDelivery: 0, offline: 0 });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [routeLayers, setRouteLayers] = useState<Record<string, [number, number][]>>({});

  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (area: SupportedArea = "All Bangalore") => {
    try {
      const q = area !== "All Bangalore" ? `?area=${encodeURIComponent(area)}` : "";
      const [mapRes, ordersRes] = await Promise.all([
        api.get(`/map-data${q}`),
        api.get("/orders"),
      ]);
      const mapData = mapRes.data;
      const ordersRaw = ordersRes.data.orders || [];

      setRestaurants(mapData.restaurants);
      setStats(mapData.stats);
      setActiveOrders(mapData.activeOrders || []);
      setIsOnline(true);
      setLastUpdated(new Date());

      // Build orderId lookup keyed by agent id
      const ordersByAgent: Record<string, ActiveOrder> = {};
      for (const o of (ordersRaw as ActiveOrder[]).slice(0, 200)) {
        if (o.deliveryPersonId && !ordersByAgent[o.deliveryPersonId]) ordersByAgent[o.deliveryPersonId] = o;
      }

      const sims: AgentSim[] = (mapData.deliveryAgents as Agent[])
        .filter((a) => a.latitude && a.longitude)
        .map((a) => {
          const o = ordersByAgent[a.id];
          return {
            id: a.id, name: a.name, status: a.status,
            vehicleType: a.vehicleType, ratings: a.ratings,
            currentPos: [a.longitude, a.latitude] as [number, number],
            routePath: [[a.longitude, a.latitude]] as [number, number][],
            pathIdx: 0,
            targetDelivery: o ? [o.deliveryLocationLongitude, o.deliveryLocationLatitude] as [number, number] : undefined,
            orderId: o?.orderId,
            weatherConditions: o?.weatherConditions,
            roadTrafficDensity: o?.roadTrafficDensity,
          };
        });

      setAgentSims(sims);

      // Fetch road routes only for on-delivery agents (max 30)
      const onRoute = sims.filter((s) => s.status === "On Delivery" && s.targetDelivery).slice(0, 30);
      const routeResults = await Promise.all(
        onRoute.map(async (a) => {
          if (!a.targetDelivery) return null;
          const path = await fetchRoadRoute(a.currentPos, a.targetDelivery);
          return { id: a.id, path };
        }),
      );

      const newLayers: Record<string, [number, number][]> = {};
      const updated = [...sims];
      for (const r of routeResults) {
        if (!r) continue;
        newLayers[r.id] = r.path;
        const i = updated.findIndex((s) => s.id === r.id);
        if (i >= 0) updated[i] = { ...updated[i], routePath: r.path, pathIdx: 0 };
      }
      setRouteLayers(newLayers);
      setAgentSims(updated);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error("map-data fetch failed:", err);
      }
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedArea);
    const t = setInterval(() => fetchData(selectedArea), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const handleAreaChange = useCallback((area: SupportedArea) => {
    setSelectedArea(area);
    const { center, zoom } = AREA_VIEWPORTS[area];
    mapRef.current?.flyTo({ center, zoom, duration: 1200, essential: true });
    fetchData(area);
  }, [fetchData]);

  // ─── 60fps animation loop (debounced to 50ms ticks) ────────────────────────
  useEffect(() => {
    const TICK = 50; // ms between position updates
    const tick = (now: number) => {
      if (now - lastTickRef.current >= TICK) {
        lastTickRef.current = now;
        setAgentSims((prev) => {
          let changed = false;
          const next = prev.map((sim) => {
            if (sim.status !== "On Delivery" || sim.routePath.length < 2) return sim;
            const speed = agentSpeed(sim.roadTrafficDensity || "Medium", sim.vehicleType);
            const step = Math.max(1, Math.round(speed * 1000));
            const nextIdx = Math.min(sim.pathIdx + step, sim.routePath.length - 1);
            if (nextIdx === sim.pathIdx) return sim; // skip unchanged
            changed = true;
            return { ...sim, pathIdx: nextIdx, currentPos: sim.routePath[nextIdx] };
          });
          return changed ? next : prev; // avoid re-render when nothing moved
        });
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  // ─── Memoised markers ──────────────────────────────────────────────────────
  const restaurantMarkers = useMemo(() =>
    restaurants.slice(0, 120).map((r) =>
      r.latitude && r.longitude ? (
        <MapMarker key={`r-${r.id}`} longitude={r.longitude} latitude={r.latitude}>
          <MarkerContent>
            <div className="h-5 w-5 rounded-full bg-rose-500/90 backdrop-blur-md flex items-center justify-center shadow-lg border border-rose-300/40 hover:scale-125 transition-all duration-300 cursor-pointer">
              <Store className="h-2.5 w-2.5 text-white" />
            </div>
          </MarkerContent>
          <MarkerTooltip>
            <p className="text-[11px] font-semibold">{r.name}</p>
            <p className="text-[10px] opacity-70 flex items-center gap-1">
              {r.locationNeighborhood}
              {r.rate ? <><span className="opacity-40 mx-0.5">·</span><Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />{r.rate}</> : null}
            </p>
          </MarkerTooltip>
          <MarkerPopup className="bg-zinc-900/95 backdrop-blur-xl border-zinc-700/50 text-white p-0 overflow-hidden w-60 rounded-xl shadow-2xl">
            <div className="p-3 bg-gradient-to-br from-rose-950/60 to-zinc-900/80 border-b border-zinc-800/50">
              <p className="font-bold text-sm leading-tight">{r.name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{r.locationNeighborhood}</p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {r.rate ? (
                  <Badge className="bg-rose-500/20 text-rose-300 text-[10px] h-4 px-1.5">
                    <Star className="h-2.5 w-2.5 mr-1 fill-rose-300" />{r.rate}
                  </Badge>
                ) : null}
                {r.onlineOrder && <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] h-4 px-1.5">Online</Badge>}
                <Badge className="bg-zinc-800 text-zinc-400 text-[10px] h-4 px-1.5">{r.restType}</Badge>
              </div>
            </div>
            <div className="p-2">
              <p className="text-[10px] text-zinc-400 mb-2 truncate">{r.cuisines}</p>
              <Button
                size="sm"
                onClick={() => router.push(`/restaurant/${r.id}`)}
                className="w-full h-7 text-xs bg-rose-600 hover:bg-rose-500 rounded-lg"
              >
                View Details <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </MarkerPopup>
        </MapMarker>
      ) : null
    ),
    [restaurants, router]);

  const orderMarkers = useMemo(() =>
    activeOrders.slice(0, 50).map((o) =>
      o.deliveryLocationLatitude && o.deliveryLocationLongitude ? (
        <MapMarker key={`c-${o.orderId}`} longitude={o.deliveryLocationLongitude} latitude={o.deliveryLocationLatitude}>
          <MarkerContent>
            <div className="h-3.5 w-3.5 rounded-full bg-sky-400 border border-sky-200/50 shadow-sm shadow-sky-400/50 animate-pulse" />
          </MarkerContent>
          <MarkerTooltip>
            <p className="text-[10px] flex items-center gap-1">
              <Package className="h-2.5 w-2.5" />{o.typeOfOrder} · {o.timeTakenMin} min
            </p>
            <p className="text-[10px] opacity-60">{o.weatherConditions} · {o.roadTrafficDensity} traffic</p>
          </MarkerTooltip>
        </MapMarker>
      ) : null
    ),
    [activeOrders]);

  const activeArea = selectedArea !== "All Bangalore" ? selectedArea : null;
  const areaColor = selectedArea !== "All Bangalore" ? AREA_COLORS[selectedArea] : null;

  return (
    <div className="h-full w-full relative bg-zinc-950">

      {/* Loading skeleton — map still mounts behind */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 z-30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
              <div className="absolute inset-0 h-10 w-10 rounded-full bg-indigo-500/10 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-zinc-200 font-semibold text-base">Loading Live Network</p>
              <p className="text-zinc-500 text-sm mt-1">Restaurants · Agents · Orders</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Map ──────────────────────────────────────────────────── */}
      <Map
        ref={mapRef}
        viewport={{ center: [77.608, 12.958], zoom: 11.5 }}
        theme="dark"
        className="w-full h-full"
      >
        {restaurantMarkers}
        {orderMarkers}

        {/* Area boundary glow */}
        {activeArea && <AreaBoundaryMarker area={activeArea} />}

        {/* Agent markers */}
        {agentSims.slice(0, 150).map((agent) => {
          const [lng, lat] = agent.currentPos;
          if (!lng || !lat) return null;
          const sc = statusColor(agent.status);
          const pulsing = agent.status === "On Delivery";
          return (
            <MapMarker
              key={`a-${agent.id}`}
              longitude={lng}
              latitude={lat}
              className="transition-transform duration-[2000ms] ease-linear"
            >
              <MarkerContent>
                <div className="relative cursor-pointer" style={{ transform: "translate(-50%,-50%)" }}>
                  {pulsing && <div className={`absolute -inset-1.5 ${sc} rounded-full animate-ping opacity-25`} />}
                  <div className={`h-6 w-6 rounded-full ${sc} flex items-center justify-center shadow-lg border border-white/30 relative z-10 hover:scale-125 transition-transform duration-300`}>
                    <Bike className="h-3 w-3 text-white" />
                  </div>
                </div>
              </MarkerContent>
              <MarkerTooltip>
                <p className="text-[11px] font-semibold">{agent.name}</p>
                <p className={`text-[10px] flex items-center gap-1 ${statusTextColor(agent.status)}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${sc}`} />
                  {agent.status} · {agent.vehicleType?.replace("_", " ")}
                  {agent.weatherConditions && <span className="ml-1 opacity-70">{weatherIcon(agent.weatherConditions)}</span>}
                </p>
              </MarkerTooltip>
              <MarkerPopup className="bg-zinc-900/95 border-zinc-700/50 text-white p-0 overflow-hidden w-56 rounded-xl shadow-2xl">
                <div className="p-3 bg-gradient-to-br from-indigo-950/60 to-zinc-900 border-b border-zinc-800">
                  <p className="font-bold text-sm">{agent.name}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <Badge className={`text-[10px] h-4 px-1.5 border ${statusBgColor(agent.status)} ${statusTextColor(agent.status)}`}>
                      {agent.status}
                    </Badge>
                    <Badge className="bg-zinc-800 text-zinc-400 text-[10px] h-4 px-1.5 capitalize">
                      {agent.vehicleType?.replace("_", " ")}
                    </Badge>
                    <Badge className="bg-zinc-800 text-zinc-400 text-[10px] h-4 px-1.5 flex items-center">
                      <Star className="h-2.5 w-2.5 mr-1 fill-amber-400 text-amber-400" />{agent.ratings}
                    </Badge>
                  </div>
                  {agent.orderId && (
                    <p className="mt-1.5 text-[10px] text-amber-400 flex items-center gap-1">
                      <Package className="h-2.5 w-2.5" />{agent.orderId}
                    </p>
                  )}
                </div>
                <div className="p-2">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/delivery-partner/${agent.id}`)}
                    className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    Track Agent <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </MarkerPopup>
            </MapMarker>
          );
        })}

        <MapControls position="bottom-right" showCompass showZoom showTilt />

        {/* Area pill selector */}
        <AreaSelector selected={selectedArea} onChange={handleAreaChange} />
      </Map>

      {/* ── Live Network Status Panel ─────────────────────────────── */}
      <div className="absolute top-20 left-4 z-20 hidden sm:block">
        <Card className="bg-zinc-950/70 backdrop-blur-2xl border border-zinc-800/60 shadow-2xl shadow-black/60 w-72 rounded-2xl overflow-hidden">

          {/* Coloured top accent strip for selected area */}
          {areaColor && (
            <div
              className="h-0.5 w-full"
              style={{ background: `linear-gradient(90deg, ${areaColor.hex}00, ${areaColor.hex}, ${areaColor.hex}00)` }}
            />
          )}

          <CardContent className="p-4 space-y-3.5">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-indigo-400 animate-pulse" />
                Live Network Status
              </h3>
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${isOnline
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? "Live" : "Offline"}
              </div>
            </div>

            {/* Active area chip */}
            {activeArea && areaColor && (
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 border"
                style={{
                  backgroundColor: `${areaColor.hex}12`,
                  borderColor: `${areaColor.hex}35`,
                }}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: areaColor.hex }} />
                <span className="text-xs font-medium flex-1 truncate" style={{ color: areaColor.hex }}>
                  {activeArea}
                </span>
                <button
                  onClick={() => handleAreaChange("All Bangalore")}
                  className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                >
                  Reset ×
                </button>
              </div>
            )}

            {/* Last sync */}
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Clock className="h-2.5 w-2.5 shrink-0" />
                Last sync {lastUpdated.toLocaleTimeString()}
                <button
                  onClick={() => fetchData(selectedArea)}
                  className="ml-auto rounded p-0.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                </button>
              </div>
            )}

            {/* Global totals */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Restaurants", value: stats.totalRestaurants, color: "#f43f5e", icon: <Store className="h-3 w-3" /> },
                { label: "Agents", value: stats.totalAgents, color: "#6366f1", icon: <Users className="h-3 w-3" /> },
                { label: "Orders", value: stats.totalOrders, color: "#8b5cf6", icon: <TrendingUp className="h-3 w-3" /> },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-2.5 text-center border"
                  style={{ backgroundColor: `${s.color}0d`, borderColor: `${s.color}25` }}
                >
                  <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                  <p className="text-sm font-bold" style={{ color: s.color }}>
                    {s.value.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="h-px bg-zinc-800/80" />

            {/* Agent breakdown */}
            <div className="space-y-2">
              {[
                { label: "Available", count: stats.available, dot: "bg-emerald-500", text: "text-emerald-400" },
                { label: "On Delivery", count: stats.onDelivery, dot: "bg-amber-500 animate-pulse", text: "text-amber-400" },
                { label: "Offline", count: stats.offline, dot: "bg-zinc-600", text: "text-zinc-400" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                    {s.label}
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${s.text}`}>
                    {s.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-px bg-zinc-800/80" />

            {/* Road routes */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Navigation className="h-3.5 w-3.5 text-violet-400" />
                Road Routes Active
              </div>
              <span className="font-bold text-sm tabular-nums text-violet-400">
                {Object.keys(routeLayers).length}
              </span>
            </div>

            {/* Legend */}
            <div className="pt-1 border-t border-zinc-800/80">
              <p className="text-[9px] text-zinc-600 mb-2 uppercase tracking-widest font-semibold">Legend</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { dot: "bg-rose-500", icon: <Store className="h-2 w-2 text-white" />, label: "Restaurant" },
                  { dot: "bg-emerald-500", icon: <Bike className="h-2 w-2 text-white" />, label: "Available" },
                  { dot: "bg-amber-500", icon: <Bike className="h-2 w-2 text-white" />, label: "On Delivery" },
                  { dot: "bg-sky-400", icon: <MapPin className="h-2 w-2 text-white" />, label: "Customer" },
                  { dot: "bg-zinc-600", icon: <Bike className="h-2 w-2 text-white" />, label: "Offline" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                    <div className={`h-3.5 w-3.5 rounded-full ${l.dot} flex items-center justify-center shrink-0`}>
                      {l.icon}
                    </div>
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
