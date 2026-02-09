# Process Builder – تقرير حالة الـ Shapes (Palette)

> الهدف: أن يستطيع مستخدم غير تقني بناء AI Agent / Workflow بدون فهم أي مصطلحات تقنية.  
> هذا الملف يوضح **أي الـ shapes شغالة، أيها ناقصة تنفيذ، وأيها properties ناقصة، وأي shapes مطلوبة لـ enterprise process builder**.

---

## 1. الـ Palette (اللوحة الجانبية) – الحالة الحالية

### Triggers (المحفزات)

| Shape | data-type | الحالة | الملاحظات |
|------|-----------|--------|-----------|
| **Start Trigger** | `trigger` | ✅ **شغال** | يُحوَّل في الـ API إلى `start`. له Properties: Form Title, Input Fields, Submit Text. الـ Engine: `StartNodeExecutor`. |
| **Schedule** | `schedule` | ⚠️ **مش شغال كبداية للـ workflow** | له Properties: Cron, Timezone. الـ Engine فيه `ScheduleNodeExecutor` لكن **لا يُحوَّل إلى start**. الـ Engine يبحث فقط عن `NodeType.START` كبداية (`get_start_node()`)، فلو المستخدم حط **Schedule** كأول خطوة بدون **Start Trigger** الـ process يفشل: "No START node". المطلوب: إما تحويل schedule → start مع تخزين نوع المحفز + الـ cron في الـ config، أو تعديل الـ engine ليقبل schedule كـ entry point. |
| **Webhook** | `webhook` | ❌ **غير منفذ** | له Properties: Method, Path, Auth. في الـ Backend **لا يوجد** `NodeType.WEBHOOK`؛ الـ webhook موجود كـ **نوع محفز** (TriggerType.HTTP_WEBHOOK) وليس كـ node. الـ normalization لا يغيّر نوع الـ node، فلو المستخدم حط Webhook فقط لا يوجد start والـ process يفشل. المطلوب: اعتبار Webhook كـ **إعداد على الـ Start** (كيف يبدأ الـ workflow: يدوي / جدولة / webhook) وليس shape منفصل أو تنفيذ Webhook كـ node. |

---

### Logic (المنطق)

| Shape | data-type | الحالة | الملاحظات |
|------|-----------|--------|-----------|
| **Condition** | `condition` | ✅ **شغال** | Properties: Field, Operator, Value. يُحوَّل إلى expression + true_branch / false_branch. الـ Engine: `ConditionNodeExecutor`. |
| **Loop** | `loop` | ⚠️ **Properties غير متوافقة مع الـ Engine** | الـ UI يرسل: `collection`, `itemVar`, `maxIterations`. الـ Engine يتوقع: `items_expression`, `item_variable`, `index_variable`, `body_nodes`, `max_iterations`. لا يوجد normalization للـ loop في الـ API، فالـ loop يشغّل بقيم افتراضية (مثلاً قائمة فارغة) أو لا يعرف الـ body. المطلوب: إضافة normalization: collection → items_expression، itemVar → item_variable، واستنتاج body_nodes من الـ edges الخارجة من الـ loop. |
| **Delay** | `delay` | ✅ **شغال** | Properties: Duration, Unit (seconds/minutes/hours/days). الـ Engine: `DelayNodeExecutor`. |

---

### Actions (الإجراءات)

| Shape | data-type | الحالة | الملاحظات |
|------|-----------|--------|-----------|
| **Action** | `action` | ⚠️ **جزئي** | الـ UI يعرض: Action Type = Custom / HTTP Request / Run Script / Transform Data. في الـ API كل **action** يُحوَّل إلى `ai_task`. الـ Engine ينفذ فقط **مهمة LLM** (prompt)؛ لا يوجد تنفيذ لـ HTTP أو Script أو Transform داخل هذا الـ node. النتيجة: **يعمل فقط** وصف نصي (Custom) يُمرَّر كـ AI task؛ HTTP/Script/Transform **غير منفذة** من خلال هذا الـ shape. للمقارنة: الـ Engine فيه `HttpRequest`, `Script`, `Transform` كـ node types منفصلة. المطلوب: إما ربط actionType بـ node type (مثلاً action+http → http_request)، أو إزالة خيارات HTTP/Script/Transform من الـ UI حتى لا نعد المستخدم بشيء غير موجود. |
| **Your Tools** (قسم في الـ palette) | `tool` | ✅ **شغال** | لا يوجد shape منفصل اسمه "Use Tool". الأدوات تظهر في قسم **Your Tools** (تُحمَّل من `GET /api/tools`). كل عنصر له `data-type="tool"` و `data-tool-id`. عند السحب يُنشأ node من نوع tool مع الـ tool محدد مسبقاً. إذا لم تظهر أي أدوات: (1) التحقق من تسجيل الدخول والـ token، (2) الـ API يرجع فقط أدوات المستخدم أو الـ public، (3) في حال فشل الطلب تُعرض رسالة "Sign in to see your tools" أو "Could not load tools". |
| **AI Action** | `ai` | ✅ **شغال** | يُحوَّل إلى `ai_task`. Properties: Prompt, Model. الـ Engine: `AITaskNodeExecutor`. |

---

### Human Tasks (مهام بشرية)

| Shape | data-type | الحالة | الملاحظات |
|------|-----------|--------|-----------|
| **Approval** | `approval` | ✅ **شغال** | Properties: Message, Approvers (Platform User/Role/Group/Tool), Timeout. الـ API يطبّق تحويل approvers → assignee_ids. الـ Engine: `ApprovalNodeExecutor`. |
| **Form Input** | `form` | ✅ **شغال (كبداية)** | يُعامل مثل الـ trigger ويُحوَّل إلى `start` مع حقول النموذج. مناسب عندما تريد نموذجاً كمدخل للـ workflow. |
| **Notification** | `notification` | ✅ **شغال** | Properties: Channel, Recipient, Message Template. الـ API يطبّق تحويل recipient → recipients، template → message. الـ Engine: `NotificationNodeExecutor`. |

---

### Flow Control

| Shape | data-type | الحالة | الملاحظات |
|------|-----------|--------|-----------|
| **End** | `end` | ✅ **شغال** | Properties: Output Variable, Success Message. الـ Engine: `EndNodeExecutor`. |

---

### Your Tools (أدواتك)

قسم ديناميكي يعرض أدوات الـ platform فقط (بدون shape عام "Use Tool"). كل عنصر: `data-type="tool"` + `data-tool-id`. السحب يضيف خطوة استخدام الأداة المحددة مباشرة.

---

## 2. ملخص سريع

| الحالة | العدد | الـ Shapes |
|--------|-------|------------|
| ✅ **شغال كامل** | 8 | trigger, condition, delay, tool, ai, approval, form, notification, end |
| ⚠️ **يحتاج إصلاح/إكمال** | 3 | schedule, loop, action |
| ❌ **غير منفذ** | 1 | webhook |

---

## 3. ما الذي ينقص لـ Enterprise Process Builder؟

الـ Engine يدعم أنواع nodes أكثر مما يظهر في الـ Palette. الـ shapes الناقصة لو حابب تقدمها لمستخدم غير تقني بأسماء واضحة:

### منطق (Logic)

- **Switch** – تفرع متعدد (أكثر من مسارين) بدل شرط Yes/No فقط.
- **While** – تكرار حسب شرط (مثل "كرّر طالما X صحيح").
- **Parallel** – تنفيذ عدة فروع في نفس الوقت ثم دمج النتائج.
- **Merge** – دمج مسارات بعد Parallel أو فروع متعددة.

### تكامل (Integration)

- **HTTP Request** – استدعاء API خارجي (الآن موجود في الـ Engine كـ `http_request` لكن في الـ UI يظهر فقط داخل "Action" ولا يعمل).
- **Database Query** – استعلام قاعدة بيانات.
- **File Operation** – قراءة/كتابة ملفات.
- **Message Queue** – إرسال/استقبال من صف رسائل.

### بيانات (Data)

- **Transform** – تحويل/تخطيط بيانات (مثلاً من شكل لشكل).
- **Validate** – التحقق من صحة بيانات.
- **Filter / Map / Aggregate** – معالجة قوائم وتهيئة مخرجات.

### توقيت وأحداث

- **Event Wait** – انتظار حدث خارجي (مثلاً رد من نظام آخر) قبل المتابعة.

### معالجة أخطاء

- **Try/Catch** – تنفيذ خطوة مع التعامل مع الأخطاء.
- **Retry** – إعادة المحاولة بعد فشل.

---

## 4. توصيات قصيرة (للمستخدم غير التقني)

1. **توحيد بداية الـ workflow**  
   جعل **بداية واحدة** في الـ UI (مثلاً "كيف يبدأ الـ workflow؟": يدوي / جدولة / استدعاء رابط) بدل ثلاثة shapes منفصلة (Trigger, Schedule, Webhook) يربك المستخدم ويسبب أخطاء عندما يضع Schedule أو Webhook بدون Start.

2. **إصلاح Loop**  
   إضافة normalization في الـ API لربط أسماء الـ properties (collection → items_expression، itemVar → item_variable) واستنتاج body من الـ connections.

3. **توضيح أو تقييد Action**  
   إما ربط "Action" بـ HTTP/Script/Transform في الـ backend، أو إخفاء هذه الخيارات وإبقاء وصف نصي (Custom) فقط حتى لا نعد بميزات غير منفذة.

4. **إضافة shapes تدريجياً**  
   إضافة أشكال واضحة للمستخدم (بدون مصطلحات تقنية) لـ: HTTP Request، Transform، Switch، Parallel/Merge، ثم لاحقاً Database، File، Retry حسب أولوية المنتج.

---

---

## 5. معاملات الـ API في خطوة "Use Tool" – Best Practice (مستخدم غير تقني)

**السؤال:** لو الـ tool بتنادي على API وبتحتاج parameters، هل يكون في shape منفصل لتمرير القيم، ولا الـ parameters تظهر في الـ properties بتاعة الـ tool مع إمكانية mapping؟

**التوصية: لا shape منفصل. الـ parameters تظهر داخل نفس خطوة الـ Tool في الـ Properties، ديناميكياً حسب تعريف الـ tool، مع إمكانية mapping من بيانات الـ workflow.**

### لماذا مش shape منفصل؟

- لو عملنا shape زي "Pass Parameters" أو "Set API Input":
  - المستخدم غير التقني يلاقي نفسه محتاج يفهم: "أنا محتاج صندوقين، واحد للـ API وواحد للقيم"، ويربط بينهم.
  - الـ flow يبقى أطول (nodes أكتر) وواضح أقل.
- الـ Best Practice في منصات no-code (Zapier, n8n, Make, Power Automate): **خطوة واحدة = فعل واحد**. "استدعاء هذا الـ API" = node واحد، وبداخله تختار الأداة وتعبّي/تربط الـ parameters.

### المطلوب في الـ UI (Properties للـ Tool node)

1. **اختيار الأداة** (موجود حالياً: قائمة "Your Tools" أو اختيار من الـ panel).
2. **بعد ما المستخدم يختار tool:**
   - لو الـ tool من نوع API وله `input_parameters` (من `api_config.input_parameters`): يظهر قسم **"API Parameters"** أو **"What to send to the API"**.
3. **لكل parameter:**
   - **اسم واضح** (من تعريف الـ tool، مع وصف إن وُجد).
   - **مصدر القيمة** (بدون مصطلحات تقنية قدر الإمكان):
     - **"From form"** أو **"From start step"**: اختيار حقل من النموذج/البداية (مثلاً "Email", "Amount").
     - **"From previous step"**: اختيار خطوة سابقة والمخرج اللي هيتستخدم (مثلاً "Result from step X").
     - **"Type a value"**: إدخال ثابت (نص أو رقم).
   - القيمة الفعلية تُخزَّن في `node.config.params` كأنها literal أو reference (مثلاً `{{form.email}}`, `{{steps.step_2.output}}`)، والـ Engine وقت التنفيذ يعمل resolve لهذه الـ references.

4. **بدون مصطلحات تقنية في الواجهة:**
   - تجنب: "Parameter", "Mapping", "Payload".  
   - استخدم: "What to send", "Value from", "From form", "From previous step", "Type value".

### ملخص

| الخيار | التوصية | السبب (لمستخدم غير تقني) |
|--------|---------|---------------------------|
| Shape منفصل لتمرير الـ parameters | ❌ لا | يزيد التعقيد وعدد الـ nodes ويحتاج فهم "ربط بيانات" بشكل صريح. |
| الـ parameters في Properties الـ tool، ديناميكية + mapping | ✅ نعم | خطوة واحدة = "استدعاء هذا الـ API"، وكل الإعداد في مكان واحد مع لغة واضحة (من النموذج، من خطوة سابقة، أو كتابة قيمة). |

الـ Backend حالياً: الـ tool له `api_config.input_parameters` (name, description, data_type, required, location). الـ Process Builder عند تحميل الـ tools من `GET /api/tools` يستقبل هذه البيانات؛ يكفي في الـ Properties panel عند اختيار tool من نوع API أن نقرأ `tool.api_config.input_parameters` ونبني الحقول ديناميكياً مع خيارات المصدر (form / previous step / type value).

---

*آخر تحديث: فبراير 2026*
