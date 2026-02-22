// Tipos para comprobantes presupuestales

export interface Institucion {
  nombre: string;
  nit: string;
  rector: string;
  tesorero: string;
  vigencia: string;
  codigo_dane: string;
}

export interface TerceroComprobante {
  nit: string;
  dv: string;
  nombre: string;
  direccion: string;
  telefono: string;
  banco: string;
  tipo_cuenta: string;
  no_cuenta: string;
}

export interface CuentaBancariaComprobante {
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  denominacion: string;
}

// ─── CDP ──────────────────────────────────────────────────────────────────────

export interface RpVinculado {
  numero: number;
  fecha: string;
  valor: number;
  tercero: string;
  nit: string;
  estado: string;
}

export interface ComprobanteCDP {
  tipo: "CDP";
  institucion: Institucion;
  documento: {
    numero: number;
    fecha: string;
    codigo_rubro: string;
    cuenta_rubro: string;
    objeto: string;
    valor: number;
    valor_letras: string;
    estado: string;
  };
  rubro: {
    codigo: string;
    cuenta: string;
    apropiacion_inicial: number;
    adiciones: number;
    reducciones: number;
    creditos: number;
    contracreditos: number;
    apropiacion_definitiva: number;
  };
  saldo_cdp: number;
  comprometido: number;
  rps_vinculados: RpVinculado[];
}

// ─── RP ───────────────────────────────────────────────────────────────────────

export interface OblVinculada {
  numero: number;
  fecha: string;
  valor: number;
  factura: string;
  estado: string;
}

export interface ComprobanteRP {
  tipo: "RP";
  institucion: Institucion;
  documento: {
    numero: number;
    fecha: string;
    cdp_numero: number;
    codigo_rubro: string;
    cuenta_rubro: string;
    nit_tercero: string;
    nombre_tercero: string;
    valor: number;
    valor_letras: string;
    objeto: string;
    estado: string;
  };
  tercero: TerceroComprobante | null;
  cdp: { numero: number; fecha: string; valor: number; objeto: string };
  rubro: { codigo: string; cuenta: string; apropiacion_definitiva: number };
  saldo_rp: number;
  obligado: number;
  obligaciones_vinculadas: OblVinculada[];
}

// ─── Obligación ───────────────────────────────────────────────────────────────

export interface PagoVinculado {
  numero: number;
  fecha: string;
  valor: number;
  medio_pago: string;
  no_comprobante: string;
  estado: string;
}

export interface ComprobanteObligacion {
  tipo: "OBLIGACION";
  institucion: Institucion;
  documento: {
    numero: number;
    fecha: string;
    rp_numero: number;
    cdp_numero: number;
    codigo_rubro: string;
    cuenta_rubro: string;
    nit_tercero: string;
    nombre_tercero: string;
    valor: number;
    valor_letras: string;
    factura: string;
    estado: string;
  };
  tercero: TerceroComprobante | null;
  rp: { numero: number; fecha: string; valor: number; objeto: string };
  cdp: { numero: number; fecha: string; valor: number };
  rubro: { codigo: string; cuenta: string; apropiacion_definitiva: number };
  saldo_obligacion: number;
  pagado: number;
  pagos_vinculados: PagoVinculado[];
}

// ─── Pago ─────────────────────────────────────────────────────────────────────

export interface ComprobantePago {
  tipo: "PAGO";
  institucion: Institucion;
  documento: {
    numero: number;
    fecha: string;
    obligacion_numero: number;
    rp_numero: number;
    cdp_numero: number;
    codigo_rubro: string;
    cuenta_rubro: string;
    nit_tercero: string;
    nombre_tercero: string;
    valor: number;
    valor_letras: string;
    concepto: string;
    medio_pago: string;
    no_comprobante: string;
    estado: string;
  };
  tercero: TerceroComprobante | null;
  obligacion: { numero: number; fecha: string; valor: number; factura: string };
  rp: { numero: number; fecha: string; objeto: string };
  cdp: { numero: number; fecha: string };
  rubro: { codigo: string; cuenta: string };
  cuenta_bancaria: CuentaBancariaComprobante | null;
}

// ─── Recaudo ──────────────────────────────────────────────────────────────────

export interface ComprobanteRecaudo {
  tipo: "RECAUDO";
  institucion: Institucion;
  documento: {
    numero: number;
    fecha: string;
    codigo_rubro: string;
    cuenta_rubro: string;
    valor: number;
    valor_letras: string;
    concepto: string;
    no_comprobante: string;
    estado: string;
  };
  rubro: {
    codigo: string;
    cuenta: string;
    presupuesto_definitivo: number;
  };
  cuenta_bancaria: CuentaBancariaComprobante | null;
}

export type Comprobante =
  | ComprobanteCDP
  | ComprobanteRP
  | ComprobanteObligacion
  | ComprobantePago
  | ComprobanteRecaudo;
