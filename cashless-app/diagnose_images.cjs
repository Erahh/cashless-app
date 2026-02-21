
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://ugvwzuphiznynamcsamh.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ""; // SHOULD NOT BE HARDCODED

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnose() {
    try {
        console.log("--- Diagnosing Verification Image Issue v3 ---");
        const commuterId = "d899612e-b6b3-4dd5-92f8-c17268fac6a5";

        // 1. Find the request
        const { data: request, error: reqErr } = await supabase
            .from("verification_requests")
            .select("*")
            .eq("commuter_id", commuterId)
            .single();

        if (reqErr) {
            console.error("Error fetching request:", reqErr.message);
            return;
        }
        console.log("Request ID:", request.id);
        console.log("Status:", request.status);

        // 2. Find the documents
        const { data: docs, error: docErr } = await supabase
            .from("verification_documents")
            .select("*")
            .eq("request_id", request.id);

        if (docErr) {
            console.error("Error fetching documents:", docErr.message);
            return;
        }

        console.log(`Found ${docs.length} documents.`);
        for (const doc of docs) {
            console.log(`- Type: ${doc.document_type}`);
            console.log(`  Path in DB: ${doc.file_path}`);

            let cleanPath = doc.file_path;
            if (cleanPath.startsWith("verification-docs/")) {
                cleanPath = cleanPath.replace("verification-docs/", "");
            }
            cleanPath = cleanPath.replace(/^\/+/, "");
            console.log(`  Clean Path: ${cleanPath}`);

            const { data: signed, error: sErr } = await supabase.storage
                .from("verification-docs")
                .createSignedUrl(cleanPath, 3600);

            if (sErr) {
                console.error(`  ❌ Signed URL Error:`, sErr.message);
            } else {
                console.log(`  ✅ Signed URL Generated`);
                // console.log(`  URL: ${signed.signedUrl}`);
            }

            // List files in the bucket for this user
            const userId = commuterId;
            const { data: files, error: listErr } = await supabase.storage
                .from("verification-docs")
                .list(userId);

            if (listErr) {
                console.error(`  ❌ List files error:`, listErr.message);
            } else {
                console.log(`  📂 Files in storage folder "${userId}":`, files.map(f => f.name));
            }
        }
    } catch (e) {
        console.error("DIAGNOSE CRASHED:", e);
    }
}

diagnose();
