import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get request body
    const { user_id, username, role, email } = await request.json();
    
    // Verify that the user_id matches the authenticated user
    if (user_id !== user.id) {
      return NextResponse.json(
        { message: "Unauthorized: Cannot update another user's profile" },
        { status: 403 }
      );
    }
    
    // Check if user already exists in the users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", user_id)
      .single();
    
    let result;
    
    if (existingUser) {
      // Update existing user
      result = await supabase
        .from("users")
        .update({
          username,
          role,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);
    } else {
      // Create new user
      result = await supabase
        .from("users")
        .insert({
          user_id,
          username,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email,
        });
    }
    
    if (result.error) {
      return NextResponse.json(
        { message: result.error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: "Profile updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
} 