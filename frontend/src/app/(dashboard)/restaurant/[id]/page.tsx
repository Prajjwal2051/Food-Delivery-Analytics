"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Star, Store, MapPin, Phone, Clock,
  Package, Activity, Cloud, Sun, CloudRain, Wind, AlertCircle,
  TrendingUp, Utensils, Wifi,
} from "lucide-react";

import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Map, MapMarker, MapRoute, MarkerContent } from "@/components/ui/map";

interface Order {
  orderId: string;
  deliveryPersonId: string;
  userId: string;
  orderDate: string;
  timeOrdered: string;
  timeTakenMin: number;
  weatherConditions: string;
  roadTrafficDensity: string;
  typeOfOrder: string;
  festival: boolean;
  restaurantLatitude: number | null;
  restaurantLongitude: number | null;
  deliveryLocationLatitude: number | null;
  deliveryLocationLongitude: number | null;
}

interface Restaurant {
  restaurantId: string;
  name: string;
  url: string | null;
  address: string | null;
  locationNeighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  rate: number | null;
  votes: number;
  approxCostForTwo: number | null;
  restType: string | null;
  cuisines: string | null;
  onlineOrder: boolean;
  bookTable: boolean;
  dishLiked: string | null;
  listedInType: string | null;
}

interface RestaurantData {
  restaurant: Restaurant;
  currentOrders: Order[];
  totalOrdersFetched: number;
}

async function fetchRoadRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    if (json.code !== "Ok") throw new Error();
    return json.routes[0].geometry.coordinates as [number, number][];
  } catch {
    return [from, to];
  }
}

function WeatherIcon({ weather }: { weather: string }) {
  if (weather === "Rainy" || weather === "Stormy") return <CloudRain className="h-3 w-3 text-blue-400" />;
  if (weather === "Windy") return <Wind className="h-3 w-3 text-teal-400" />;
  if (weather === "Cloudy") return <Cloud className="h-3 w-3 text-zinc-400" />;
  return <Sun className="h-3 w-3 text-amber-400" />;
}

function TrafficBadge({ density }: { density: string }) {
  const cls = density === "Jam" ? "bg-rose-500/20 text-rose-400" :
    density === "High" ? "bg-orange-500/20 text-orange-400" :
    density === "Medium" ? "bg-amber-500/20 text-amber-400" :
    "bg-emerald-500/20 text-emerald-400";
  return <Badge className={`text-[10px] h-4 px-1.5 border-none ${cls}`}>{density}</Badge>;
}

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [data, setData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/restaurant/${id}`)
      .then(res => setData(res.data))
      .catch(err => console.error("Failed to fetch restaurant:", err))
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
        <p className="text-zinc-400">Restaurant not found</p>
        <Button onClick={() => router.back()} variant="outline" className="border-zinc-800 text-zinc-300">Go Back</Button>
      </div>
    );
  }

  const { restaurant: r, currentOrders } = data;

  // Compute analytics from orders
  const avgTime = currentOrders.length
    ? (currentOrders.reduce((s, o) => s + (o.timeTakenMin || 0), 0) / currentOrders.length).toFixed(1)
    : null;

  const weatherCounts: Record<string, number> = {};
  const trafficCounts: Record<string, number> = {};
  let festivalOrders = 0;
  for (const o of currentOrders) {
    if (o.weatherConditions) weatherCounts[o.weatherConditions] = (weatherCounts[o.weatherConditions] || 0) + 1;
    if (o.roadTrafficDensity) trafficCounts[o.roadTrafficDensity] = (trafficCounts[o.roadTrafficDensity] || 0) + 1;
    if (o.festival) festivalOrders++;
  }

  const ratingColor = !r.rate ? "text-zinc-500" :
    r.rate >= 4.5 ? "text-emerald-400" : r.rate >= 4.0 ? "text-amber-400" : r.rate >= 3.5 ? "text-orange-400" : "text-rose-400";

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/restaurants")} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {/* Hero Card */}
        <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-rose-600 to-orange-600" />
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="h-16 w-16 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                <Store className="h-8 w-8 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-3 mb-1">
                  <h1 className="text-xl font-bold text-white leading-tight">{r.name}</h1>
                  <div className={`flex items-center gap-1 text-lg font-bold ${ratingColor}`}>
                    {r.rate ?? "—"} <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {r.address || r.locationNeighborhood}
                </p>
                <div className="flex flex-wrap gap-2">
                  {r.restType && <Badge className="bg-zinc-800 text-zinc-300 text-xs border-none">{r.restType}</Badge>}
                  {r.onlineOrder && <Badge className="bg-emerald-500/15 text-emerald-400 text-xs border-none"><Wifi className="h-2.5 w-2.5 mr-1" />Online Order</Badge>}
                  {r.bookTable && <Badge className="bg-sky-500/15 text-sky-400 text-xs border-none">Book Table</Badge>}
                  {r.approxCostForTwo && <Badge className="bg-zinc-800 text-zinc-300 text-xs border-none">₹{r.approxCostForTwo} for 2</Badge>}
                  {r.votes > 0 && <Badge className="bg-zinc-800 text-zinc-400 text-xs border-none">{r.votes.toLocaleString()} votes</Badge>}
                </div>
              </div>
            </div>

            {/* Cuisine + Dishes */}
            {r.cuisines && (
              <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap gap-1.5">
                {r.cuisines.split(",").map(c => (
                  <Badge key={c} className="bg-rose-500/10 text-rose-300 text-[10px] px-1.5 py-0 h-5 border-none">{c.trim()}</Badge>
                ))}
              </div>
            )}
            {r.dishLiked && (
              <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                <Utensils className="h-3 w-3 text-zinc-600" /> Popular: {r.dishLiked}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Package className="h-4 w-4 text-indigo-400" />, label: "Orders Fetched", value: currentOrders.length, bg: "bg-indigo-500/10" },
            { icon: <Clock className="h-4 w-4 text-amber-400" />, label: "Avg Delivery", value: avgTime ? `${avgTime} min` : "—", bg: "bg-amber-500/10" },
            { icon: <TrendingUp className="h-4 w-4 text-emerald-400" />, label: "Festival Orders", value: festivalOrders, bg: "bg-emerald-500/10" },
            { icon: <Activity className="h-4 w-4 text-violet-400" />, label: "Neighborhood", value: r.locationNeighborhood || "—", bg: "bg-violet-500/10" },
          ].map(s => (
            <Card key={s.label} className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>{s.icon}</div>
                <div className="text-lg font-bold text-white">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
                <div className="text-xs text-zinc-500">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Map */}
        {r.latitude && r.longitude && (
          <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden" style={{ height: 380 }}>
            <RestaurantMapComponent restaurant={r} orders={currentOrders} />
          </Card>
        )}

        {/* Analytics: weather + traffic */}
        {currentOrders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-zinc-400">Weather at Delivery Time</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {Object.entries(weatherCounts).map(([w, c]) => (
                  <div key={w} className="flex items-center gap-2">
                    <WeatherIcon weather={w} />
                    <span className="text-xs text-zinc-400 flex-1">{w}</span>
                    <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(c / currentOrders.length) * 100}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500 w-5 text-right">{c}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-zinc-400">Traffic Density</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {Object.entries(trafficCounts).map(([t, c]) => {
                  const col = t === "Jam" ? "bg-rose-500" : t === "High" ? "bg-orange-500" : t === "Medium" ? "bg-amber-500" : "bg-emerald-500";
                  return (
                    <div key={t} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col}`} />
                      <span className="text-xs text-zinc-400 flex-1">{t}</span>
                      <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${col} rounded-full`} style={{ width: `${(c / currentOrders.length) * 100}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500 w-5 text-right">{c}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Orders Table */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-rose-400" /> Order History
              <Badge className="bg-zinc-800 text-zinc-400 text-[10px] border-none">{currentOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    {["Order ID", "Date", "Time", "Duration", "Agent", "Weather", "Traffic", "Type"].map(h => (
                      <TableHead key={h} className="text-zinc-500 text-xs font-semibold">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentOrders.slice(0, 50).map(o => (
                    <TableRow key={o.orderId} className="border-zinc-800/60 hover:bg-zinc-800/30">
                      <TableCell className="font-mono text-xs text-rose-400">{o.orderId}</TableCell>
                      <TableCell className="text-xs text-zinc-400">{o.orderDate}</TableCell>
                      <TableCell className="text-xs text-zinc-400">{o.timeOrdered}</TableCell>
                      <TableCell className="text-xs text-white font-bold">{o.timeTakenMin} min</TableCell>
                      <TableCell
                        className="text-xs text-indigo-400 cursor-pointer hover:underline"
                        onClick={() => router.push(`/delivery-partner/${o.deliveryPersonId}`)}
                      >
                        {o.deliveryPersonId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-zinc-400">
                          <WeatherIcon weather={o.weatherConditions} /> {o.weatherConditions}
                        </div>
                      </TableCell>
                      <TableCell><TrafficBadge density={o.roadTrafficDensity} /></TableCell>
                      <TableCell className="text-xs text-zinc-400">{o.typeOfOrder}</TableCell>
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

// ─── Map sub-component ─────────────────────────────────────────────────────────
function RestaurantMapComponent({ restaurant: r, orders }: { restaurant: Restaurant; orders: Order[] }) {
  const center: [number, number] = [r.longitude!, r.latitude!];
  const deliveryOrders = orders.filter(o => o.deliveryLocationLongitude && o.deliveryLocationLatitude).slice(0, 15);

  return (
    <Map viewport={{ center, zoom: 12.5 }} theme="dark">
      {/* Restaurant */}
      <MapMarker longitude={center[0]} latitude={center[1]}>
        <MarkerContent>
          <div className="h-8 w-8 rounded-full bg-rose-500 border-2 border-white shadow-xl flex items-center justify-center">
            <Store className="h-4 w-4 text-white" />
          </div>
        </MarkerContent>
      </MapMarker>

      {/* Delivery locations */}
      {deliveryOrders.map(o => (
        <MapMarker
          key={o.orderId}
          longitude={o.deliveryLocationLongitude!}
          latitude={o.deliveryLocationLatitude!}
        >
          <MarkerContent>
            <div className="h-5 w-5 rounded-full bg-emerald-500 border border-white shadow-md flex items-center justify-center">
              <MapPin className="h-2.5 w-2.5 text-white" />
            </div>
          </MarkerContent>
        </MapMarker>
      ))}

      {/* Route lines from restaurant to delivery locations */}
      {deliveryOrders.map(o => (
        <MapRoute
          key={`route-${o.orderId}`}
          coordinates={[
            [r.longitude!, r.latitude!],
            [o.deliveryLocationLongitude!, o.deliveryLocationLatitude!],
          ]}
          color="#f43f5e"
          width={1.5}
          opacity={0.5}
          dashArray={[4, 3]}
        />
      ))}
    </Map>
  );
}
