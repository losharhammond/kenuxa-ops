import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Seed demo data for new users to make the platform feel populated
 * This is called automatically on first login
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll: (items: any[]) =>
            items.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            ),
        },
      }
    );

    // Sample businesses
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id")
      .limit(1);

    if (!businesses || businesses.length === 0) {
      const sampleBusinesses = [
        {
          name: "KENUXA Tech Solutions",
          description: "Leading software development company in Ghana",
          type: "tech",
          category: "tech",
          phone: "+233 30 123 4567",
          email: "info@kenuxa-tech.com",
          status: "active",
          city: "Accra",
          country: "Ghana",
          logo_url: "https://via.placeholder.com/200?text=KENUXA+Tech",
          is_verified: true,
        },
        {
          name: "Fresh Produce Market",
          description: "Organic fresh produce and vegetables from local farms",
          type: "agriculture",
          category: "agriculture",
          phone: "+233 24 987 6543",
          email: "sales@freshproduce.com",
          status: "active",
          city: "Kumasi",
          country: "Ghana",
          logo_url: "https://via.placeholder.com/200?text=Fresh+Produce",
          is_verified: true,
        },
        {
          name: "City Pharmacy",
          description: "Your trusted neighborhood pharmacy",
          type: "pharmacy",
          category: "pharmacy",
          phone: "+233 20 555 1111",
          email: "contact@citypharmacy.com",
          status: "active",
          city: "Takoradi",
          country: "Ghana",
          logo_url: "https://via.placeholder.com/200?text=City+Pharmacy",
          is_verified: true,
        },
      ];

      await supabase.from("businesses").insert(sampleBusinesses);
    }

    // Sample products
    const { data: products } = await supabase
      .from("marketplace_listings")
      .select("id")
      .limit(1);

    if (!products || products.length === 0) {
      const sampleProducts = [
        {
          title: "Premium Laptop Stand",
          description: "Adjustable aluminum laptop stand for better ergonomics",
          price: 89.99,
          currency: "GHS",
          category: "Electronics",
          condition: "new",
          stock_qty: 45,
          images: ["https://via.placeholder.com/300?text=Laptop+Stand"],
          is_available: true,
        },
        {
          title: "Wireless Headphones",
          description: "High-quality Bluetooth headphones with noise cancellation",
          price: 199.99,
          currency: "GHS",
          category: "Electronics",
          condition: "new",
          stock_qty: 23,
          images: ["https://via.placeholder.com/300?text=Headphones"],
          is_available: true,
        },
        {
          title: "Organic Coffee Beans",
          description: "100% pure organic coffee from highland farms",
          price: 45.00,
          currency: "GHS",
          category: "Agriculture",
          condition: "new",
          stock_qty: 156,
          images: ["https://via.placeholder.com/300?text=Coffee"],
          is_available: true,
        },
      ];

      await supabase.from("marketplace_listings").insert(sampleProducts);
    }

    // Sample services
    const { data: services } = await supabase
      .from("service_listings")
      .select("id")
      .limit(1);

    if (!services || services.length === 0) {
      const sampleServices = [
        {
          title: "Web Development",
          description: "Professional web development and design services",
          category: "Technology",
          price: 1500,
          currency: "GHS",
          price_type: "fixed",
          is_available: true,
        },
        {
          title: "Business Consulting",
          description: "Expert business strategy and consulting",
          category: "Consulting",
          price: 200,
          currency: "GHS",
          price_type: "hourly",
          is_available: true,
        },
        {
          title: "Graphic Design",
          description: "Custom logo and branding design",
          category: "Design",
          price: 500,
          currency: "GHS",
          price_type: "fixed",
          is_available: true,
        },
      ];

      await supabase.from("service_listings").insert(sampleServices);
    }

    return NextResponse.json({
      success: true,
      message: "Demo data seeded successfully",
    });
  } catch (error) {
    console.error("[seed/demo-data]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to seed data",
      },
      { status: 500 }
    );
  }
}
