"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Bike, Star, Navigation, MapPin, Package,
  History, Store, Clock, CloudRain, Sun, Cloud, Wind, Activity,
  TrendingUp, AlertCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Map, MapMarker, MapRoute, MarkerContent } from "@/components/ui/map";

interface Order {
  orderId: string;
  restaurantId: string;
  userId: string;
  orderDate: string;
  timeOrdered: string;
  timeTakenMin: number;
  weatherConditions: string;
  roadTrafficDensity: string;
  typeOfOrder: string;
  typeOfVehicle: string;
  multipleDeliveries: number;
  festival: boolean;
  restaurantLatitude: number | null;
  restaurantLongitude: number | null;
  deliveryLocationLatitude: number | null;
  deliveryLocationLongitude: number | null;
}

interface Agent {
  deliveryPersonId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  age: number | null;
  ratings: number | null;
  vehicleType: string;
  vehicleCondition: number | null;
  status: string;
  currentLatitude: number | null;
  currentLongitude: number | null;
  totalDeliveries: number;
  city: string;
}

interface Analytics {
  totalOrdersFetched: number;
  avgDeliveryTime: string | null;
  weatherBreakdown: Record<string, number>;
  trafficBreakdown: Record<string, number>;
}

interface AgentData {
  agent: Agent;
  orders: Order[];
  analytics: Analytics;
}

// Fetch OSRM road route
async function fetchRoadRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error();
    const json = await res.json();
    if (json.code !== "Ok" || !json.routes?.[0]) throw new Error();
    return json.routes[0].geometry.coordinates as [number, number][];
  } catch {
    return [from, to];
  }
}

function TrafficBadge({ density }: { density: string }) {
  const cls = density === "Jam" ? "bg-rose-500/20 text-rose-400" :
    density === "High" ? "bg-orange-500/20 text-orange-400" :
    density === "Medium" ? "bg-amber-500/20 text-amber-400" :
    "bg-emerald-500/20 text-emerald-400";
  return <Badge className={`text-[10px] h-4 px-1.5 border-none ${cls}`}>{density}</Badge>;
}

function WeatherIcon({ weather }: { weather: string }) {
  if (weather === "Rainy" || weather === "Stormy") return <CloudRain className="h-3 w-3 text-blue-400" />;
  if (weather === "Windy") return <Wind className="h-3 w-3 text-teal-400" />;
  if (weather === "Cloudy") return <Cloud className="h-3 w-3 text-zinc-400" />;
  return <Sun className="h-3 w-3 text-amber-400" />;
}

export default function DeliveryPartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/delivery-partner/${id}`)
      .then(res => setData(res.data))
      .catch(err => console.error("Failed to fetch agent:", err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-zinc-950 gap-4">
        <AlertCircle className="h-12 w-12 text-zinc-600" />
        <p className="text-zinc-400">Delivery partner not found</p>
        <Button onClick={() => router.back()} variant="outline" className="border-zinc-800 text-zinc-300">
          Go Back
        </Button>
      </div>
    );
  }

  const { agent, orders, analytics } = data;
  const statusColor = agent.status === "Available" ? "text-emerald-400" : agent.status === "On Delivery" ? "text-amber-400" : "text-zinc-400";
  const statusBg = agent.status === "Available" ? "bg-emerald-500/10" : agent.status === "On Delivery" ? "bg-amber-500/10" : "bg-zinc-800";

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Back + Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/delivery-agents")} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {/* Agent Profile Card */}
        <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-600 to-violet-600" />
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-2xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <Bike className="h-10 w-10 text-indigo-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-3 mb-2">
                  <h1 className="text-xl font-bold text-white">{agent.firstName} {agent.lastName}</h1>
                  <Badge className={`${statusBg} ${statusColor} border-none text-xs`}>{agent.status}</Badge>
                </div>
                <p className="text-xs text-zinc-500 mb-3">{agent.deliveryPersonId} · {agent.city}</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { icon: <Star className="h-3.5 w-3.5 text-amber-400" />, label: "Rating", value: agent.ratings?.toFixed(2) || "—" },
                    { icon: <Package className="h-3.5 w-3.5 text-indigo-400" />, label: "Deliveries", value: agent.totalDeliveries.toLocaleString() },
                    { icon: <Bike className="h-3.5 w-3.5 text-violet-400" />, label: "Vehicle", value: agent.vehicleType?.replace("_", " ") || "—" },
                    { icon: <Clock className="h-3.5 w-3.5 text-emerald-400" />, label: "Avg Time", value: analytics.avgDeliveryTime ? `${analytics.avgDeliveryTime} min` : "—" },
                    ...(agent.age ? [{ icon: <Activity className="h-3.5 w-3.5 text-rose-400" />, label: "Age", value: String(agent.age) }] : []),
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5">
                      {s.icon}
                      <span className="text-zinc-400 text-xs">{s.label}:</span>
                      <span className="text-white text-xs font-semibold capitalize">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Weather breakdown */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5" /> Weather Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {Object.entries(analytics.weatherBreakdown).map(([w, c]) => (
                <div key={w} className="flex items-center gap-2">
                  <WeatherIcon weather={w} />
                  <span className="text-xs text-zinc-400 flex-1">{w}</span>
                  <div className="h-1.5 w-20 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{
                      width: `${(c / analytics.totalOrdersFetched) * 100}%`
                    }} />
                  </div>
                  <span className="text-xs text-zinc-500 w-6 text-right">{c}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Traffic breakdown */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Traffic Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {Object.entries(analytics.trafficBreakdown).map(([t, c]) => {
                const col = t === "Jam" ? "bg-rose-500" : t === "High" ? "bg-orange-500" : t === "Medium" ? "bg-amber-500" : "bg-emerald-500";
                return (
                  <div key={t} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col}`} />
                    <span className="text-xs text-zinc-400 flex-1">{t}</span>
                    <div className="h-1.5 w-20 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${col} rounded-full`} style={{ width: `${(c / analytics.totalOrdersFetched) * 100}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500 w-6 text-right">{c}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Live Location */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5" /> Current Location
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {agent.currentLatitude && agent.currentLongitude ? (
                <div className="space-y-2">
                  <div className="bg-zinc-800/60 rounded-lg p-3">
                    <p className="text-xs text-zinc-400">Latitude</p>
                    <p className="text-sm font-mono font-bold text-white">{agent.currentLatitude.toFixed(6)}</p>
                  </div>
                  <div className="bg-zinc-800/60 rounded-lg p-3">
                    <p className="text-xs text-zinc-400">Longitude</p>
                    <p className="text-sm font-mono font-bold text-white">{agent.currentLongitude.toFixed(6)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-600">No location data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        {agent.currentLatitude && agent.currentLongitude && (
          <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden" style={{ height: 360 }}>
            <MapComponent agent={agent} orders={orders} />
          </Card>
        )}

        {/* Orders Table */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              Delivery History
              <Badge className="bg-zinc-800 text-zinc-400 text-[10px] border-none ml-1">{orders.length} orders</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    {["Order ID", "Date", "Time", "Duration", "Weather", "Traffic", "Type", "Festival"].map(h => (
                      <TableHead key={h} className="text-zinc-500 text-xs font-semibold">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 50).map(o => (
                    <TableRow key={o.orderId} className="border-zinc-800/60 hover:bg-zinc-800/30">
                      <TableCell className="font-mono text-xs text-indigo-400">{o.orderId}</TableCell>
                      <TableCell className="text-xs text-zinc-400">{o.orderDate}</TableCell>
                      <TableCell className="text-xs text-zinc-400">{o.timeOrdered}</TableCell>
                      <TableCell className="text-xs text-white font-semibold">{o.timeTakenMin} min</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-zinc-400">
                          <WeatherIcon weather={o.weatherConditions} /> {o.weatherConditions}
                        </div>
                      </TableCell>
                      <TableCell><TrafficBadge density={o.roadTrafficDensity} /></TableCell>
                      <TableCell className="text-xs text-zinc-400">{o.typeOfOrder}</TableCell>
                      <TableCell>
                        {o.festival && <Badge className="bg-amber-500/20 text-amber-400 text-[10px] border-none">🎉 Yes</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Map Sub-Component (avoids SSR issues) ─────────────────────────────────────
function MapComponent({ agent, orders }: { agent: Agent; orders: Order[] }) {
  const center: [number, number] = [agent.currentLongitude!, agent.currentLatitude!];

  // Use first order with location data for route
  const orderWithLoc = orders.find(o =>
    o.restaurantLatitude && o.restaurantLongitude &&
    o.deliveryLocationLatitude && o.deliveryLocationLongitude
  );

  const [roadRoute, setRoadRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!orderWithLoc?.deliveryLocationLongitude) return;
    fetchRoadRoute(
      center,
      [orderWithLoc.deliveryLocationLongitude, orderWithLoc.deliveryLocationLatitude!]
    ).then(setRoadRoute);
  }, [agent.deliveryPersonId]);

  return (
    <Map viewport={{ center, zoom: 13 }} theme="dark">
      {/* Agent marker */}
      <MapMarker longitude={center[0]} latitude={center[1]}>
        <MarkerContent>
          <div className="relative">
            <div className="absolute -inset-2 bg-indigo-500 rounded-full animate-ping opacity-25" />
            <div className="h-7 w-7 rounded-full bg-indigo-500 border-2 border-white shadow-lg flex items-center justify-center relative">
              <Bike className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
        </MarkerContent>
      </MapMarker>

      {/* Restaurant marker */}
      {orderWithLoc?.restaurantLongitude && orderWithLoc?.restaurantLatitude && (
        <MapMarker longitude={orderWithLoc.restaurantLongitude} latitude={orderWithLoc.restaurantLatitude}>
          <MarkerContent>
            <div className="h-6 w-6 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center">
              <Store className="h-3 w-3 text-white" />
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      {/* Delivery destination */}
      {orderWithLoc?.deliveryLocationLongitude && orderWithLoc?.deliveryLocationLatitude && (
        <MapMarker longitude={orderWithLoc.deliveryLocationLongitude} latitude={orderWithLoc.deliveryLocationLatitude}>
          <MarkerContent>
            <div className="h-6 w-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center">
              <MapPin className="h-3 w-3 text-white" />
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      {/* Road route */}
      {roadRoute.length >= 2 && (
        <MapRoute coordinates={roadRoute} color="#8b5cf6" width={3} opacity={0.85} dashArray={[2, 1]} />
      )}
    </Map>
  );
}
