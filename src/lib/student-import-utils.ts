import { SupabaseClient, Session } from "@supabase/supabase-js";
import * as XLSX from "xlsx"; // Import xlsx library
import * as z from "zod";
import { showInfoToast, showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { classOptions } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

// Define the schema for a single student row from Excel
const studentSchema = z.object({
  name: z.string().trim().min(1, "Nama tidak boleh kosong"),
  nisn: z.string().trim().min(1, "NISN tidak boleh kosong"),
  // Class must exactly match one of the classOptions, including casing
  class: z.enum(classOptions as [string, ...string[]], { message: "Kelas tidak valid. Pastikan sesuai dengan daftar kelas yang tersedia (contoh: 'Kelas 1', 'Kelas 2')." }),
});

type StudentExcelRow = z.infer<typeof studentSchema>;

interface ImportStudentsOptions {
  file: File;
  // Removed supabase from here as it's imported directly
  session: Session;
  teacherClassTaught: string;
  onImportComplete: () => void;
  setIsImporting: (loading: boolean) => void;
}

export async function importStudentsFromFile({
  file,
  // Removed supabase from here
  session,
  teacherClassTaught,
  onImportComplete,
  setIsImporting,
}: ImportStudentsOptions) {
  setIsImporting(true);

  // Validate file type
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    showErrorToast("Hanya file Excel (.xlsx atau .xls) yang didukung untuk impor.");
    setIsImporting(false);
    return;
  }

  // Upload file to Supabase Storage (optional, but good for logging/auditing)
  const filePath = `imports/${session.user.id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('student-imports')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    showErrorToast("Gagal mengunggah file ke penyimpanan: " + uploadError.message);
    setIsImporting(false);
    return;
  } else {
    showInfoToast("File berhasil diunggah ke penyimpanan. Memulai proses impor...");
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

      const studentsToInsert: (StudentExcelRow & { teacher_id: string; parent_id: null })[] = [];
      const errors: string[] = [];

      if (!session?.user?.id) {
        showErrorToast("Anda harus login sebagai guru untuk mengimpor siswa.");
        setIsImporting(false);
        return;
      }

      if (!teacherClassTaught) {
        showErrorToast("Kelas yang diajar guru tidak ditemukan. Harap hubungi Admin untuk menetapkan kelas Anda.");
        setIsImporting(false);
        return;
      }

      if (!jsonRows || jsonRows.length === 0) {
        showErrorToast("Tidak ada data yang ditemukan di file atau format tidak valid.");
        setIsImporting(false);
        return;
      }

      for (const row of jsonRows) {
        // Explicitly convert to string and handle potential undefined/null values from Excel
        const name = String(row.Nama || '').trim();
        const nisn = String(row.NISN || '').trim();
        const studentClass = String(row.Kelas || '').trim();

        const parsedRow = studentSchema.safeParse({
          name: name,
          nisn: nisn,
          class: studentClass,
        });

        if (!parsedRow.success) {
          const errorMessages = parsedRow.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          errors.push(`Baris dengan data ${JSON.stringify(row)} gagal divalidasi: ${errorMessages}`);
          continue;
        }

        // Check if the student's class matches the teacher's class taught
        if (parsedRow.data.class !== teacherClassTaught) {
          errors.push(`Siswa ${parsedRow.data.name} (${parsedRow.data.nisn}) tidak dapat diimpor. Kelas di file ('${parsedRow.data.class}') tidak cocok dengan kelas yang Anda ajar ('${teacherClassTaught}').`);
          continue;
        }

        studentsToInsert.push({
          name: parsedRow.data.name,
          nisn: parsedRow.data.nisn,
          class: parsedRow.data.class,
          teacher_id: session.user.id,
          parent_id: null,
        });
      }

      if (studentsToInsert.length === 0) {
        showErrorToast("Tidak ada data siswa yang valid ditemukan di file setelah validasi. Pastikan semua kolom terisi dan kelas sesuai.");
        setIsImporting(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const student of studentsToInsert) {
        const { error } = await supabase.from("students").insert(student);
        if (error) {
          if (error.code === "23505") {
            errors.push(`NISN ${student.nisn} sudah terdaftar.`);
          } else {
            errors.push(`Gagal menambahkan siswa ${student.name} (${student.nisn}): ${error.message}`);
          }
          failCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        showSuccessToast(`${successCount} siswa berhasil diimpor!`);
      }
      if (errors.length > 0) {
        showErrorToast(`Gagal mengimpor ${failCount} siswa. Detail kesalahan di konsol.`);
        console.error("Import Errors:", errors);
      }
      setIsImporting(false);
      onImportComplete(); // Callback to trigger navigation/re-fetch
    } catch (err: any) {
      showErrorToast("Gagal memproses file Excel: " + err.message);
      setIsImporting(false);
    }
  };
  reader.onerror = (err) => {
    showErrorToast("Gagal membaca file: " + err);
    setIsImporting(false);
  };
  reader.readAsArrayBuffer(file);
}

export function downloadStudentTemplate() {
  const headers = ["Nama", "NISN", "Kelas"];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Siswa");
  XLSX.writeFile(wb, "template_siswa.xlsx");
  showSuccessToast("Template Excel berhasil diunduh!");
}