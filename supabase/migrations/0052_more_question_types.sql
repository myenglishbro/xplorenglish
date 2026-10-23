-- Dominio: nuevos tipos de pregunta autocorregibles para ejercicios.
-- Depende de: 0048 (private.grade_activity).
--
-- Tipos nuevos (el contenido se valida en el cliente, ver server/questionBank/validation.ts):
--   multiple_select -- varias respuestas correctas. Respuesta = índices marcados; se compara como
--                      CONJUNTO (el orden en que se marcaron no importa).
--   short_answer    -- texto corto. La clave es una lista de respuestas aceptadas; cada una admite
--                      alternativas con '|'. Sin distinguir mayúsculas ni espacios en los bordes.
--   ordering        -- ordenar piezas. Respuesta = índices de las piezas en el orden elegido;
--                      igualdad exacta contra la clave.
--   categorize      -- clasificar. Respuesta = índice de categoría por elemento; igualdad exacta.
-- multiple_choice / true_false / matching / fill_blank conservan su comportamiento de 0048.
--
-- assign_exercise (0048) no cambia: separa `answer` de cada item sin mirar su tipo.

create or replace function private.grade_activity(p_items jsonb, p_key jsonb, p_answers jsonb)
returns table (score integer, max_score integer, results jsonb)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_n integer := coalesce(jsonb_array_length(p_items), 0);
  v_score integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_ok boolean;
  v_type text;
  v_a jsonb;
  v_k jsonb;
  v_j integer;
  v_alts text[];
begin
  for i in 0 .. v_n - 1 loop
    v_type := p_items -> i ->> 'type';
    v_a := p_answers -> i;
    v_k := p_key -> i;
    v_ok := false;

    if v_a is not null and jsonb_typeof(v_a) <> 'null' and v_k is not null then
      if v_type = 'fill_blank' then
        if jsonb_typeof(v_a) = 'array' and jsonb_typeof(v_k) = 'array'
           and jsonb_array_length(v_a) = jsonb_array_length(v_k) then
          v_ok := true;
          for v_j in 0 .. jsonb_array_length(v_k) - 1 loop
            if jsonb_typeof(v_a -> v_j) <> 'string' or jsonb_typeof(v_k -> v_j) <> 'string' then
              v_ok := false;
              exit;
            end if;
            select array_agg(lower(btrim(x))) into v_alts
            from unnest(string_to_array(v_k ->> v_j, '|')) as x;
            if not (lower(btrim(v_a ->> v_j)) = any (v_alts)) then
              v_ok := false;
              exit;
            end if;
          end loop;
        end if;

      elsif v_type = 'short_answer' then
        if jsonb_typeof(v_a) = 'string' and jsonb_typeof(v_k) = 'array' then
          select coalesce(bool_or(lower(btrim(v_a #>> '{}')) = lower(btrim(alt))), false) into v_ok
          from jsonb_array_elements_text(v_k) as k (txt),
               lateral unnest(string_to_array(k.txt, '|')) as alt;
        end if;

      elsif v_type = 'multiple_select' then
        if jsonb_typeof(v_a) = 'array' and jsonb_typeof(v_k) = 'array' then
          v_ok := (select coalesce(jsonb_agg(distinct x order by x), '[]'::jsonb) from jsonb_array_elements(v_a) as x)
                = (select coalesce(jsonb_agg(distinct x order by x), '[]'::jsonb) from jsonb_array_elements(v_k) as x);
        end if;

      else
        -- multiple_choice, true_false, matching, ordering, categorize: igualdad exacta.
        v_ok := (v_a = v_k);
      end if;
    end if;

    if v_ok then v_score := v_score + 1; end if;
    v_results := v_results || to_jsonb(v_ok);
  end loop;

  return query select v_score, v_n, v_results;
end;
$$;

revoke all on function private.grade_activity(jsonb, jsonb, jsonb) from public, anon, authenticated;
