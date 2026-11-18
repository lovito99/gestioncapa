-- NULL conserva la ausencia de una tarifa general en los cursos históricos.
alter table cursos add column "precioGeneral" numeric(12,2);
alter table cursos add constraint "precioGeneralCoherente" check (
  "precioGeneral" is null or (costo = 0 and "precioGeneral" = 0)
  or (costo > 0 and "precioGeneral" > 0 and "precioGeneral" <= 9999999999.99)
);
