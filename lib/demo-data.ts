export type ProgramFieldType = "text" | "email" | "tel" | "number" | "date" | "textarea" | "select" | "file" | "checkbox" | "location";

export type ProgramField = {
  id: string;
  label: string;
  type: ProgramFieldType;
  required: boolean;
  helpText?: string;
  options?: string[];
  condition?: string;
  section?: string;
};

export type ScreeningRule = {
  id: string;
  label: string;
  description: string;
  hardFail: boolean;
  enabled: boolean;
  fieldId?: string;
  operator?: "present" | "equals" | "contains" | "gte";
  value?: string;
};

export type FranchiseProgram = {
  id: string;
  fieldSchemaVersion?: number;
  name: string;
  summary: string;
  investmentLabel: string;
  operatingModel: string;
  locations: string;
  open: boolean;
  fields: ProgramField[];
  screeningRules: ScreeningRule[];
};

export type ApplicationStage =
  | "submitted"
  | "screening"
  | "review"
  | "revision"
  | "interview"
  | "proposal"
  | "approved"
  | "rejected";

export const APPLICATION_STAGES: { id: ApplicationStage; label: string }[] = [
  { id: "submitted", label: "Baru masuk" },
  { id: "screening", label: "Pemeriksaan awal" },
  { id: "review", label: "Peninjauan" },
  { id: "revision", label: "Perlu revisi" },
  { id: "interview", label: "Wawancara" },
  { id: "proposal", label: "Proposal" },
  { id: "approved", label: "Disetujui" },
  { id: "rejected", label: "Ditutup" },
];

export type DemoDocument = { name: string; status: "received" | "needs-update"; fieldId?: string };
export type LocationAssessment = {
  rating: "promising" | "needs-review" | "insufficient-data";
  summary: string;
  signals: string[];
  gaps: string[];
};
export type DocumentFinding = { fieldId: "businessProfile" | "financialSummary"; summary: string; verificationItems: string[] };

export type FranchiseApplication = {
  id: string;
  reference: string;
  programId: string;
  programName: string;
  applicantIdentityId?: string;
  applicantName: string;
  email: string;
  phone: string;
  city: string;
  investmentCapacity: number;
  experience: string;
  submittedAt: string;
  stage: ApplicationStage;
  withdrawnAt?: string;
  score: number;
  owner: string;
  summary: string;
  screening?: {
    outcome: "pass" | "warning" | "reject";
    reasons: string[];
    checks: { id: string; label: string; outcome: "pass" | "warning" | "reject"; reason: string }[];
  };
  reviewSource?: "pending" | "rules" | "gemini";
  reviewNote?: string;
  locationAssessment?: LocationAssessment;
  documentFindings?: DocumentFinding[];
  documentNote?: string;
  followUpQuestions?: string[];
  strengths: string[];
  concerns: string[];
  documents: DemoDocument[];
  revisionItems: string[];
  revisionFieldIds?: string[];
  revisionNotes?: string[];
  locationNotes: string;
  answers: Record<string, string>;
  proposal?: {
    summary: string;
    amount: string;
    terms?: { area: string; operatingModel: string; duration: string; initialFee: string; royalty: string; conditions: string };
    attachments?: string[];
    franchisorResponse?: "accepted";
    sentAt?: string;
    response?: "accepted" | "rejected" | "changes-requested";
  };
};

export const DEMO_PROGRAMS: FranchiseProgram[] = [
  {
    id: "restaurant-partner",
    fieldSchemaVersion: 4,
    name: "Mitra Pengelola Restoran",
    summary: "Kemitraan untuk pengelola restoran.",
    investmentLabel: "Kapasitas investasi akan ditinjau bersama tim",
    operatingModel: "Pengelolaan aktif oleh mitra",
    locations: "Kota besar di Indonesia",
    open: true,
    fields: [
      { id: "fullName", label: "Nama lengkap", type: "text", required: true, section: "Data diri" },
      { id: "email", label: "Alamat email", type: "email", required: true, section: "Data diri" },
      { id: "phone", label: "Nomor telepon", type: "tel", required: true, section: "Data diri" },
      { id: "gender", label: "Jenis kelamin", type: "select", required: false, options: ["Perempuan", "Laki-laki", "Memilih tidak menjawab"], section: "Data diri" },
      { id: "governmentEmployment", label: "Apakah Anda pejabat pemerintah atau bekerja di instansi pemerintah?", type: "select", required: true, options: ["Ya", "Tidak"], section: "Data diri" },
      { id: "age", label: "Usia", type: "number", required: true, section: "Data diri" },
      { id: "residentialAddress", label: "Alamat tempat tinggal", type: "textarea", required: true, section: "Data diri" },
      { id: "city", label: "Kota pilihan", type: "text", required: true, section: "Informasi lokasi" },
      { id: "occupation", label: "Pekerjaan saat ini", type: "text", required: true, section: "Profil pemohon" },
      { id: "companyName", label: "Perusahaan atau badan usaha", type: "text", required: false, section: "Profil pemohon" },
      { id: "educationLevel", label: "Pendidikan terakhir", type: "select", required: true, options: ["SMA/SMK", "Diploma", "Sarjana", "Pascasarjana", "Lainnya"], section: "Profil pemohon" },
      { id: "businessType", label: "Jenis usaha yang pernah dikelola", type: "text", required: true, section: "Pengalaman usaha" },
      { id: "businessDuration", label: "Lama pengalaman usaha (tahun)", type: "number", required: true, section: "Pengalaman usaha" },
      { id: "experience", label: "Pengalaman mengelola bisnis", type: "textarea", required: true, section: "Pengalaman usaha" },
      { id: "franchiseHistory", label: "Pernah menjadi mitra franchise?", type: "select", required: true, options: ["Belum pernah", "Pernah"], section: "Pengalaman usaha" },
      { id: "motivation", label: "Alasan mengajukan kemitraan", type: "textarea", required: true, section: "Pengalaman usaha" },
      { id: "investmentCapacity", label: "Kapasitas investasi", type: "select", required: true, options: ["Di bawah Rp 10 miliar", "Rp 10–25 miliar", "Di atas Rp 25 miliar"], section: "Kesiapan usaha" },
      { id: "fundingSource", label: "Sumber pendanaan", type: "select", required: true, options: ["Dana pribadi", "Mitra usaha", "Pembiayaan", "Kombinasi"], section: "Kesiapan usaha" },
      { id: "partnerNames", label: "Nama mitra usaha", type: "text", required: false, section: "Kesiapan usaha" },
      { id: "ownershipSplit", label: "Pembagian kepemilikan", type: "text", required: false, section: "Kesiapan usaha" },
      { id: "availability", label: "Ketersediaan waktu untuk operasional", type: "select", required: true, options: ["Penuh waktu", "Paruh waktu", "Belum ditentukan"], section: "Kesiapan usaha" },
      { id: "targetOpening", label: "Perkiraan tanggal mulai operasional", type: "date", required: true, section: "Kesiapan usaha" },
      { id: "siteAddress", label: "Alamat atau area yang diminati", type: "textarea", required: true, section: "Informasi lokasi" },
      { id: "sitePin", label: "Titik lokasi di peta", type: "location", required: true, helpText: "Klik peta atau geser pin ke lokasi yang diajukan.", section: "Informasi lokasi" },
      { id: "siteOwnership", label: "Status lokasi", type: "select", required: true, options: ["Milik sendiri", "Sewa", "Belum tersedia"], section: "Informasi lokasi" },
      { id: "siteArea", label: "Luas area yang tersedia (m²)", type: "number", required: false, section: "Informasi lokasi" },
      { id: "buildingType", label: "Jenis bangunan", type: "select", required: false, options: ["Bangunan mandiri", "Ruko", "Pusat perbelanjaan", "Rest area", "Lainnya"], section: "Informasi lokasi" },
      { id: "siteTraffic", label: "Kondisi lalu lintas dan akses lokasi", type: "textarea", required: false, section: "Kondisi lokasi" },
      { id: "sitePhotos", label: "Foto lokasi (jika tersedia)", type: "file", required: false, section: "Kondisi lokasi" },
      { id: "siteNotes", label: "Catatan lokasi", type: "textarea", required: false, section: "Kondisi lokasi" },
      { id: "businessProfile", label: "Profil bisnis", type: "file", required: true, section: "Dokumen" },
      { id: "resume", label: "Resume/CV", type: "file", required: false, section: "Dokumen" },
      { id: "financialSummary", label: "Ringkasan kemampuan finansial", type: "file", required: true, section: "Dokumen" },
      { id: "ktp", label: "NIK sesuai KTP", type: "text", required: true, section: "Data diri" },
      { id: "npwp", label: "Nomor NPWP", type: "text", required: false, section: "Legalitas usaha" },
      { id: "nib", label: "Nomor NIB", type: "text", required: false, section: "Legalitas usaha" },
      { id: "dataConsent", label: "Saya menyetujui pemrosesan data untuk meninjau pengajuan ini.", type: "checkbox", required: true, section: "Persetujuan" },
      { id: "aiConsent", label: "Izinkan Google Gemini meringkas jawaban dan membaca dokumen bisnis/finansial. Jangan unggah KTP atau nomor identitas.", type: "checkbox", required: false, section: "Persetujuan" },
    ],
    screeningRules: [
      { id: "identity", label: "Identitas pemohon lengkap", description: "Nama, email, dan nomor telepon tersedia.", hardFail: true, enabled: true },
      { id: "investment", label: "Kapasitas investasi dicantumkan", description: "Tim akan meninjau kapasitas dan sumber pendanaan.", hardFail: false, enabled: true, fieldId: "investmentCapacity", operator: "present" },
      { id: "experience", label: "Pengalaman bisnis tersedia", description: "Pengalaman menjadi bahan pertimbangan reviewer.", hardFail: false, enabled: true, fieldId: "experience", operator: "present" },
    ],
  },
  {
    id: "strategic-location",
    fieldSchemaVersion: 4,
    name: "Usulan Lokasi Strategis",
    summary: "Pengajuan lokasi untuk rencana ekspansi.",
    investmentLabel: "Dibahas bersama tim",
    operatingModel: "Tinjauan peluang lokasi",
    locations: "Area yang belum terlayani",
    open: true,
    fields: [
      { id: "fullName", label: "Nama lengkap", type: "text", required: true, section: "Data diri" },
      { id: "email", label: "Alamat email", type: "email", required: true, section: "Data diri" },
      { id: "phone", label: "Nomor telepon", type: "tel", required: true, section: "Data diri" },
      { id: "gender", label: "Jenis kelamin", type: "select", required: false, options: ["Perempuan", "Laki-laki", "Memilih tidak menjawab"], section: "Data diri" },
      { id: "governmentEmployment", label: "Apakah Anda pejabat pemerintah atau bekerja di instansi pemerintah?", type: "select", required: true, options: ["Ya", "Tidak"], section: "Data diri" },
      { id: "age", label: "Usia", type: "number", required: true, section: "Data diri" },
      { id: "residentialAddress", label: "Alamat tempat tinggal", type: "textarea", required: true, section: "Data diri" },
      { id: "occupation", label: "Pekerjaan saat ini", type: "text", required: true, section: "Profil pemohon" },
      { id: "companyName", label: "Perusahaan atau badan usaha", type: "text", required: false, section: "Profil pemohon" },
      { id: "educationLevel", label: "Pendidikan terakhir", type: "select", required: true, options: ["SMA/SMK", "Diploma", "Sarjana", "Pascasarjana", "Lainnya"], section: "Profil pemohon" },
      { id: "businessType", label: "Jenis usaha yang pernah dikelola", type: "text", required: false, section: "Pengalaman usaha" },
      { id: "businessDuration", label: "Lama pengalaman usaha (tahun)", type: "number", required: false, section: "Pengalaman usaha" },
      { id: "experience", label: "Pengalaman bisnis", type: "textarea", required: true, section: "Pengalaman usaha" },
      { id: "franchiseHistory", label: "Pernah menjadi mitra franchise?", type: "select", required: true, options: ["Belum pernah", "Pernah"], section: "Pengalaman usaha" },
      { id: "motivation", label: "Alasan mengajukan lokasi", type: "textarea", required: true, section: "Pengalaman usaha" },
      { id: "city", label: "Kota lokasi", type: "text", required: true, section: "Informasi lokasi" },
      { id: "siteAddress", label: "Alamat lokasi", type: "textarea", required: true, section: "Informasi lokasi" },
      { id: "sitePin", label: "Titik lokasi di peta", type: "location", required: true, helpText: "Klik peta atau geser pin ke lokasi yang diajukan.", section: "Informasi lokasi" },
      { id: "siteOwnership", label: "Status lokasi", type: "select", required: true, options: ["Milik sendiri", "Sewa", "Dalam penjajakan"], section: "Informasi lokasi" },
      { id: "siteArea", label: "Luas area yang tersedia (m²)", type: "number", required: true, section: "Informasi lokasi" },
      { id: "buildingType", label: "Jenis bangunan", type: "select", required: true, options: ["Bangunan mandiri", "Ruko", "Pusat perbelanjaan", "Rest area", "Lainnya"], section: "Informasi lokasi" },
      { id: "siteTraffic", label: "Kondisi lalu lintas dan akses lokasi", type: "textarea", required: true, section: "Kondisi lokasi" },
      { id: "sitePhotos", label: "Foto lokasi", type: "file", required: true, section: "Kondisi lokasi" },
      { id: "siteNotes", label: "Catatan lokasi", type: "textarea", required: false, section: "Kondisi lokasi" },
      { id: "businessProfile", label: "Profil bisnis", type: "file", required: true, section: "Dokumen" },
      { id: "resume", label: "Resume/CV", type: "file", required: false, section: "Dokumen" },
      { id: "ktp", label: "NIK sesuai KTP", type: "text", required: true, section: "Data diri" },
      { id: "npwp", label: "Nomor NPWP", type: "text", required: false, section: "Legalitas usaha" },
      { id: "nib", label: "Nomor NIB", type: "text", required: false, section: "Legalitas usaha" },
      { id: "dataConsent", label: "Saya menyetujui pemrosesan data untuk meninjau pengajuan ini.", type: "checkbox", required: true, section: "Persetujuan" },
      { id: "aiConsent", label: "Izinkan Google Gemini meringkas jawaban dan membaca dokumen bisnis/finansial. Jangan unggah KTP atau nomor identitas.", type: "checkbox", required: false, section: "Persetujuan" },
    ],
    screeningRules: [
      { id: "identity", label: "Identitas pemohon lengkap", description: "Nama, email, dan nomor telepon tersedia.", hardFail: true, enabled: true },
      { id: "location", label: "Informasi lokasi tersedia", description: "Alamat dan foto lokasi akan diperiksa manual.", hardFail: false, enabled: true, fieldId: "siteAddress", operator: "present" },
    ],
  },
];

export const DEMO_APPLICATIONS: FranchiseApplication[] = [
  {
    id: "app-26041",
    reference: "FR-26041",
    programId: "restaurant-partner",
    programName: "Mitra Pengelola Restoran",
    applicantName: "Nadia Putri",
    email: "nadia.putri@example.test",
    phone: "+62 812 3456 7890",
    city: "Jakarta Selatan",
    investmentCapacity: 18000000000,
    experience: "Mengelola jaringan restoran keluarga selama 8 tahun dengan 3 lokasi aktif.",
    submittedAt: "2026-09-28T09:15:00.000Z",
    stage: "review",
    score: 82,
    owner: "Dimas Pratama",
    summary: "Pengalaman operasional kuat dan dokumen utama tersedia. Perlu konfirmasi sumber dana dan rencana keterlibatan harian.",
    strengths: ["Pengalaman operasional 8 tahun", "Pernah mengelola beberapa lokasi", "Dokumen profil tersedia"],
    concerns: ["Rencana keterlibatan harian belum rinci", "Ringkasan finansial perlu konfirmasi"],
    documents: [{ name: "Profil bisnis.pdf", status: "received" }, { name: "Ringkasan finansial.pdf", status: "received" }],
    revisionItems: [],
    locationNotes: "Kandidat mengutamakan area Jakarta Selatan. Belum ada analisis lokasi otomatis.",
    answers: { fullName: "Nadia Putri", email: "nadia.putri@example.test", phone: "+62 812 3456 7890", city: "Jakarta Selatan", investmentCapacity: "Rp 10–25 miliar", experience: "Mengelola jaringan restoran keluarga selama 8 tahun dengan 3 lokasi aktif." },
  },
  {
    id: "app-26035",
    reference: "FR-26035",
    programId: "restaurant-partner",
    programName: "Mitra Pengelola Restoran",
    applicantName: "Rizky Pratama",
    email: "rizky.pratama@example.test",
    phone: "+62 813 5550 1020",
    city: "Bandung",
    investmentCapacity: 12000000000,
    experience: "Membangun usaha distribusi makanan dan mengelola 24 karyawan.",
    submittedAt: "2026-09-25T04:30:00.000Z",
    stage: "revision",
    score: 74,
    owner: "Sari Wibowo",
    summary: "Latar belakang usaha relevan. Mohon lengkapi profil badan usaha dan dokumen kemampuan finansial yang lebih baru.",
    strengths: ["Pengalaman bisnis 6 tahun", "Pernah memimpin tim operasional"],
    concerns: ["Profil badan usaha belum dilampirkan", "Dokumen finansial perlu diperbarui"],
    documents: [{ name: "Profil bisnis.pdf", status: "needs-update" }],
    revisionItems: ["Unggah profil badan usaha", "Perbarui ringkasan kemampuan finansial"],
    locationNotes: "Pilihan awal Bandung. Tinjauan lokasi dilakukan manual.",
    answers: { fullName: "Rizky Pratama", email: "rizky.pratama@example.test", phone: "+62 813 5550 1020", city: "Bandung", investmentCapacity: "Rp 10–25 miliar", experience: "Membangun usaha distribusi makanan dan mengelola 24 karyawan." },
  },
  {
    id: "app-26028",
    reference: "FR-26028",
    programId: "strategic-location",
    programName: "Usulan Lokasi Strategis",
    applicantName: "Dewi Anggraini",
    email: "dewi.anggraini@example.test",
    phone: "+62 811 2300 3456",
    city: "Surabaya",
    investmentCapacity: 0,
    experience: "Pemilik lahan komersial di koridor transportasi utama.",
    submittedAt: "2026-09-21T08:00:00.000Z",
    stage: "interview",
    score: 89,
    owner: "Dimas Pratama",
    summary: "Lokasi memiliki akses jalan dan visibilitas yang baik. Perlu pembahasan batas lahan serta akses kendaraan.",
    strengths: ["Lokasi berada di koridor utama", "Foto dan alamat telah diterima"],
    concerns: ["Status dan batas lahan perlu dikonfirmasi"],
    documents: [{ name: "Foto lokasi.zip", status: "received" }],
    revisionItems: [],
    locationNotes: "Akses dua arah. Review manual diperlukan sebelum keputusan.",
    answers: { fullName: "Dewi Anggraini", email: "dewi.anggraini@example.test", phone: "+62 811 2300 3456", city: "Surabaya", siteAddress: "Koridor pusat kota, Surabaya", siteNotes: "Lahan komersial dekat simpang utama." },
  },
  {
    id: "app-26022",
    reference: "FR-26022",
    programId: "restaurant-partner",
    programName: "Mitra Pengelola Restoran",
    applicantName: "Bima Setiawan",
    email: "bima.setiawan@example.test",
    phone: "+62 812 8800 2211",
    city: "Jakarta Timur",
    investmentCapacity: 24000000000,
    experience: "Mengelola bisnis ritel keluarga dan tim operasional lintas lokasi.",
    submittedAt: "2026-09-18T10:10:00.000Z",
    stage: "proposal",
    score: 86,
    owner: "Sari Wibowo",
    summary: "Tinjauan awal selesai. Proposal konsep telah disiapkan untuk dibahas bersama pemohon.",
    strengths: ["Pengalaman mengelola bisnis multi-lokasi", "Dokumen utama tersedia"],
    concerns: ["Ketentuan akhir perlu dibahas bersama"],
    documents: [{ name: "Profil usaha.pdf", status: "received" }, { name: "Ringkasan finansial.pdf", status: "received" }],
    revisionItems: [],
    locationNotes: "Area pilihan Jakarta Timur. Tinjauan lokasi tetap dilakukan manual.",
    answers: { fullName: "Bima Setiawan", email: "bima.setiawan@example.test", phone: "+62 812 8800 2211", city: "Jakarta Timur", investmentCapacity: "Di atas Rp 25 miliar", experience: "Mengelola bisnis ritel keluarga dan tim operasional lintas lokasi." },
    proposal: { summary: "Proposal kemitraan untuk area Jakarta Timur.", amount: "Rincian dibahas bersama tim" },
  },
];

const PROGRAMS_KEY = "franchise-prototype:programs:v2";
const PREVIOUS_PROGRAMS_KEY = "franchise-prototype:programs:v1";
const APPLICATIONS_KEY = "franchise-prototype:applications:v1";
let remoteWorkspaceLoaded = false;

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return structuredClone(fallback);
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function writeStored<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("franchise-prototype:update"));
}

function migratePrograms(previous: FranchiseProgram[], preserveRemovedFields = false): FranchiseProgram[] {
  return previous.map((program) => {
    const defaults = DEMO_PROGRAMS.find((item) => item.id === program.id);
    if (!defaults || (preserveRemovedFields && (program.fieldSchemaVersion ?? 0) >= 4)) return program;
    const previousFields = new Map(program.fields.map((field) => [field.id, field]));
    const defaultFieldIds = new Set(defaults.fields.map((field) => field.id));
    const previousRules = new Map(program.screeningRules.map((rule) => [rule.id, rule]));
    const defaultRuleIds = new Set(defaults.screeningRules.map((rule) => rule.id));
    const oldSections: Record<string, string[]> = {
      occupation: ["Profil dan pengalaman"],
      companyName: ["Profil dan pengalaman"],
      educationLevel: ["Profil dan pengalaman"],
      businessType: ["Profil dan pengalaman"],
      businessDuration: ["Profil dan pengalaman"],
      experience: ["Profil dan pengalaman"],
      franchiseHistory: ["Profil dan pengalaman"],
      motivation: ["Profil dan pengalaman"],
      city: ["Rencana usaha"],
      siteAddress: ["Rencana usaha"],
      siteOwnership: ["Rencana usaha"],
      siteTraffic: ["Rencana usaha", "Informasi lokasi"],
      sitePhotos: ["Rencana usaha", "Informasi lokasi"],
      siteNotes: ["Rencana usaha", "Informasi lokasi"],
      ktp: ["Dokumen"],
      npwp: ["Dokumen"],
      nib: ["Dokumen"],
    };
    const migrateField = (field: ProgramField, old?: ProgramField): ProgramField => {
      if (!old) return field;
      const migrated = { ...field, ...old };
      const oldTypes: Record<string, ProgramFieldType> = { ktp: "file", npwp: "file", nib: "file", targetOpening: "text", sitePin: "text" };
      if (old.type === oldTypes[field.id]) migrated.type = field.type;
      const oldLabels: Record<string, string> = {
        ktp: "KTP",
        npwp: "NPWP",
        nib: "NIB badan usaha (jika tersedia)",
        businessProfile: "Profil bisnis atau CV",
        targetOpening: "Target waktu mulai",
        dataConsent: "Saya menyetujui penggunaan dan analisis otomatis atas data untuk meninjau pengajuan ini.",
      };
      if (old.label === oldLabels[field.id]) migrated.label = field.label;
      if (oldSections[field.id]?.includes(old.section ?? "") && old.section !== field.section) migrated.section = field.section;
      return migrated;
    };
    const fields = preserveRemovedFields
      ? [
          ...program.fields.map((old) => migrateField(defaults.fields.find((field) => field.id === old.id) ?? old, old)),
          ...defaults.fields.filter((field) => ["siteArea", "buildingType", "sitePin", "aiConsent", "gender", "governmentEmployment", "resume"].includes(field.id) && !previousFields.has(field.id)),
        ]
      : [
          ...defaults.fields.map((field) => migrateField(field, previousFields.get(field.id))),
          ...program.fields.filter((field) => !defaultFieldIds.has(field.id)),
        ];
    return {
      ...defaults,
      ...program,
      fieldSchemaVersion: 4,
      fields,
      screeningRules: preserveRemovedFields
        ? program.screeningRules
        : [
            ...defaults.screeningRules.map((rule) => ({ ...rule, ...previousRules.get(rule.id) })),
            ...program.screeningRules.filter((rule) => !defaultRuleIds.has(rule.id)),
          ],
    };
  });
}

export function readDemoPrograms() {
  if (process.env.NODE_ENV !== "development" && !remoteWorkspaceLoaded) return structuredClone(DEMO_PROGRAMS);
  if (typeof window === "undefined") return structuredClone(DEMO_PROGRAMS);
  try {
    const current = window.localStorage.getItem(PROGRAMS_KEY);
    if (current) {
      const migrated = migratePrograms(JSON.parse(current) as FranchiseProgram[], true);
      if (JSON.stringify(migrated) !== current) window.localStorage.setItem(PROGRAMS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    const previous = window.localStorage.getItem(PREVIOUS_PROGRAMS_KEY);
    if (!previous) return structuredClone(DEMO_PROGRAMS);
    const migrated = migratePrograms(JSON.parse(previous) as FranchiseProgram[]);
    window.localStorage.setItem(PROGRAMS_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return structuredClone(DEMO_PROGRAMS);
  }
}
export const writeDemoPrograms = (programs: FranchiseProgram[]) => writeStored(PROGRAMS_KEY, programs);
export const readDemoApplications = () => process.env.NODE_ENV !== "development" && !remoteWorkspaceLoaded
  ? []
  : readStored(APPLICATIONS_KEY, process.env.NODE_ENV === "development" ? DEMO_APPLICATIONS : []);
export const writeDemoApplications = (applications: FranchiseApplication[]) => writeStored(APPLICATIONS_KEY, applications);
export const hasRemoteWorkspace = () => remoteWorkspaceLoaded;

export function clearDemoWorkspace() {
  if (typeof window === "undefined") return;
  remoteWorkspaceLoaded = false;
  window.localStorage.removeItem(PROGRAMS_KEY);
  window.localStorage.removeItem(PREVIOUS_PROGRAMS_KEY);
  window.localStorage.removeItem(APPLICATIONS_KEY);
  window.dispatchEvent(new Event("franchise-prototype:update"));
}

export function hydrateDemoWorkspace(programs: FranchiseProgram[], applications: FranchiseApplication[]) {
  if (typeof window === "undefined") return false;
  const migrated = migratePrograms(programs, true);
  const changed = JSON.stringify(migrated) !== JSON.stringify(programs);
  window.localStorage.setItem(PROGRAMS_KEY, JSON.stringify(migrated));
  window.localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
  remoteWorkspaceLoaded = true;
  window.dispatchEvent(new Event("franchise-prototype:update"));
  return changed;
}

export function saveDemoApplication(application: FranchiseApplication) {
  const applications = readDemoApplications();
  const index = applications.findIndex((item) => item.id === application.id);
  const next = index === -1
    ? [application, ...applications]
    : applications.map((item) => item.id === application.id ? application : item);
  writeDemoApplications(next);
  return next;
}

export function updateDemoApplication(id: string, changes: Partial<FranchiseApplication>) {
  const applications = readDemoApplications();
  const current = applications.find((item) => item.id === id);
  if (!current) return undefined;
  const updated = { ...current, ...changes, ...(changes.stage && changes.stage !== "rejected" ? { withdrawnAt: undefined } : {}) };
  writeDemoApplications(applications.map((item) => item.id === id ? updated : item));
  return updated;
}
