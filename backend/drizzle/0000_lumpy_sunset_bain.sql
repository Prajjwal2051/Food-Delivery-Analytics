DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('admin', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."agent_status" AS ENUM('Available', 'On Delivery', 'Offline');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."vehicle_type" AS ENUM('motorcycle', 'scooter', 'electric_scooter', 'bicycle');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."order_type" AS ENUM('Snack', 'Meal', 'Drinks', 'Buffet');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."road_traffic_density" AS ENUM('Low', 'Medium', 'High', 'Jam');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."weather_conditions" AS ENUM('Sunny', 'Cloudy', 'Rainy', 'Foggy', 'Windy', 'Stormy');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "auth_accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delivery_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_person_id" varchar(10) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"age" integer,
	"ratings" numeric(3, 2),
	"vehicle_type" "vehicle_type",
	"vehicle_condition" integer DEFAULT 1,
	"status" "agent_status" DEFAULT 'Available',
	"current_latitude" numeric(10, 6),
	"current_longitude" numeric(10, 6),
	"total_deliveries" integer DEFAULT 0,
	"city" varchar(100) DEFAULT 'Bengaluru',
	CONSTRAINT "delivery_agents_delivery_person_id_unique" UNIQUE("delivery_person_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(15) NOT NULL,
	"restaurant_id" varchar(10) NOT NULL,
	"delivery_person_id" varchar(10) NOT NULL,
	"user_id" varchar(10) NOT NULL,
	"restaurant_latitude" numeric(10, 6),
	"restaurant_longitude" numeric(10, 6),
	"delivery_location_latitude" numeric(10, 6),
	"delivery_location_longitude" numeric(10, 6),
	"order_date" date,
	"time_ordered" time,
	"time_order_picked" time,
	"time_taken_min" integer,
	"weather_conditions" "weather_conditions",
	"road_traffic_density" "road_traffic_density",
	"vehicle_condition" integer,
	"type_of_order" "order_type",
	"type_of_vehicle" varchar(20),
	"multiple_deliveries" integer DEFAULT 0,
	"festival" boolean DEFAULT false,
	"city" varchar(100) DEFAULT 'Bengaluru',
	CONSTRAINT "orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "restaurants" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text,
	"address" text,
	"location_neighborhood" varchar(100),
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6),
	"phone" varchar(20),
	"rate" numeric(3, 1),
	"votes" integer DEFAULT 0,
	"approx_cost_for_two" integer,
	"rest_type" varchar(50),
	"cuisines" text,
	"online_order" boolean DEFAULT false,
	"book_table" boolean DEFAULT false,
	"dish_liked" text,
	"listed_in_type" varchar(50),
	"listed_in_city" varchar(100),
	CONSTRAINT "restaurants_restaurant_id_unique" UNIQUE("restaurant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(10) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"default_latitude" numeric(10, 6),
	"default_longitude" numeric(10, 6),
	"city" varchar(100) DEFAULT 'Bengaluru',
	"location_area" varchar(100),
	"created_at" date,
	CONSTRAINT "users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_restaurants_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("restaurant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_person_id_delivery_agents_delivery_person_id_fk" FOREIGN KEY ("delivery_person_id") REFERENCES "public"."delivery_agents"("delivery_person_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
