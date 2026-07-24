-- AlphaDog — expande a biblioteca de exercícios.
--
-- O enum exercise_id (migration 0001) tinha só sit/paw/down. A biblioteca
-- cresceu para 11 comandos, cobrindo básico, obediência, autocontrole, foco e
-- enriquecimento. training_sessions.exercise_id usa este enum, então os valores
-- novos precisam existir no banco antes de qualquer sessão gravar com eles.
--
-- ADD VALUE IF NOT EXISTS é idempotente: rodar de novo não quebra. Um valor por
-- comando, na ordem em que aparecem no catálogo de @alphadog/core.

alter type exercise_id add value if not exists 'touch';
alter type exercise_id add value if not exists 'stay';
alter type exercise_id add value if not exists 'come';
alter type exercise_id add value if not exists 'heel';
alter type exercise_id add value if not exists 'watch';
alter type exercise_id add value if not exists 'leave_it';
alter type exercise_id add value if not exists 'wait_food';
alter type exercise_id add value if not exists 'find_it';
