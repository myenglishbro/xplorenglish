-- Dominio: ciclo de vida de paquetes de horas (versión reducida, aprobada). Nuevos valores de
-- estado -- en su propia migración porque Postgres no permite usar un valor de enum recién
-- agregado dentro de la MISMA transacción en la que se agregó.
alter type public.package_status add value if not exists 'cancelled';
alter type public.package_status add value if not exists 'refunded';
