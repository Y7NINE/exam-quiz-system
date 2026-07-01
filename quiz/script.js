/**
 * AAA海鲜批发老王刷题系统
 */

const App = {
    data: { chapters: [], questions: [], subjects: [] },
    currentSubjectId: null,

    // 解析 Markdown 图片语法，返回 HTML img 标签
    parseMarkdownImage(text) {
        if (!text) return text;
        // 匹配 ![alt](src) 格式
        return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:10px 0;">');
    },
    state: {
        currentPage: 'home',
        previousPage: null,
        currentQuiz: null,
        currentQuestionIndex: 0,
        selectedAnswer: null,
        isAnswered: false,
        examConfig: { count: 30, types: ['single', 'judge', 'short'] },
        examHistory: [],
        examQuiz: null,
        examAnswers: {},
        examStartTime: null,
        examTimerInterval: null,
        chapterQuiz: null,
        chapterAnswers: {},
        wrongQuiz: null,
        wrongAnswers: {},
        studyQuiz: null,
        studyViewed: {},
    },
    user: {
        answered: {},
        wrong: {},
        favorites: new Set(),
        history: [],
    },

    async init() {
        this.initTheme();
        // 根据页面文件名自动检测科目，先加载内嵌数据保底
        const filename = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        if (filename === 'software_analysis') {
            this.currentSubjectId = 'software_analysis';
            this.loadEmbeddedData(); // 先加载内嵌数据
            try { await this.loadSubjectData('software_analysis'); } catch(e) { console.log('使用内嵌数据'); }
        } else if (filename === 'software_project_management') {
            this.currentSubjectId = 'software_project_management';
            this.loadEmbeddedSPMData(); // 先加载内嵌数据
            try { await this.loadSubjectData('software_project_management'); } catch(e) { console.log('使用内嵌数据'); }
        } else {
            await this.loadSubjectRegistry();
            const saved = localStorage.getItem('quiz_current_subject');
            this.currentSubjectId = saved || (this.data.subjects.find(s => s.default) || this.data.subjects[0])?.id;
            await this.loadSubjectData(this.currentSubjectId);
        }
        this.loadUserProgress();
        this.setupEventListeners();
        this.renderHome();
        this.renderChapters();
        this.updateSidebarStats();
        this.checkFirstVisit();
        console.log('AAA海鲜批发老王刷题系统初始化完成');
    },

    checkFirstVisit() {
        const hasVisited = localStorage.getItem('quiz_visited');
        if (!hasVisited) {
            document.getElementById('firstVisitModal').classList.add('active');
        }
    },

    closeFirstVisitModal() {
        document.getElementById('firstVisitModal').classList.remove('active');
        localStorage.setItem('quiz_visited', 'true');
    },

    async loadSubjectRegistry() {
        try {
            const resp = await fetch('subjects/registry.json?t=' + Date.now());
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            this.data.subjects = await resp.json();
        } catch (e) {
            console.log('科目注册表加载失败，使用默认科目列表');
            this.data.subjects = [
                { id: 'software_analysis', name: '软件系统分析与体系结构设计', icon: '🐟', file: 'software_analysis.json', default: true },
                { id: 'software_project_management', name: '软件项目管理', icon: '📋', file: 'software_project_management.json' }
            ];
        }
    },

    async loadSubjectData(subjectId) {
        // 内置科目信息（无需 registry.json）
        const builtInSubjects = {
            software_analysis: { id: 'software_analysis', name: '软件系统分析与体系结构设计', icon: '🐟', file: 'software_analysis.json' },
            software_project_management: { id: 'software_project_management', name: '软件项目管理', icon: '📋', file: 'software_project_management.json' }
        };
        const subject = this.data.subjects.find(s => s.id === subjectId) || builtInSubjects[subjectId];
        if (!subject) { console.error('未知科目:', subjectId); return; }
        // 确保 data.subjects 包含此科目
        if (!this.data.subjects.find(s => s.id === subjectId)) {
            this.data.subjects.push(subject);
        }
        try {
            const response = await fetch('subjects/' + subject.file + '?t=' + Date.now());
            const data = await response.json();
            this.data.chapters = data.chapters || [];
            this.data.questions = data.questions || [];
            this.currentSubjectId = subjectId;
            localStorage.setItem('quiz_current_subject', subjectId);
            console.log('加载科目成功:', subject.name, '共', this.data.questions.length, '题');
        } catch (error) {
            console.log('科目数据加载失败:', subjectId, error);
            if (subjectId === 'software_analysis') this.loadEmbeddedData();
            else if (subjectId === 'software_project_management') this.loadEmbeddedSPMData();
        }
    },

    async switchSubject(subjectId) {
        if (subjectId === this.currentSubjectId) return;
        await this.loadSubjectData(subjectId);
        this.loadUserProgress();
        this.renderSubjectSwitcher();
        this.renderHome();
        this.renderChapters();
        this.updateSidebarStats();
        this.showPage('home');
        this.showToast('已切换到：' + (this.data.subjects.find(s => s.id === subjectId)?.name || subjectId));
    },

    loadEmbeddedData() {
        this.data.chapters = [{"id":1,"name":"软件工程概述","icon":"📘"},{"id":2,"name":"软件需求分析与结构化设计","icon":"📗"},{"id":3,"name":"UML与面向对象基础","icon":"📙"},{"id":4,"name":"UML用例分析","icon":"📕"},{"id":5,"name":"UML类图","icon":"📓"},{"id":6,"name":"UML动态建模","icon":"📔"},{"id":7,"name":"UML实现建模","icon":"📒"},{"id":10,"name":"设计模式","icon":"🎯"}];
        this.data.questions = [
            {"id":1,"chapter":1,"type":"single","question":"软件故障曲线呈现（）","options":["锯齿状","U状","L状","n状"],"answer":"A","explanation":"软件故障曲线呈U状，早期和晚期故障率高，中期稳定。"},
            {"id":2,"chapter":1,"type":"single","question":"专家系统是属于软件开发技术的（）","options":["早期","第二阶段","第三阶段","第四阶段"],"answer":"D","explanation":"专家系统属于第四阶段的软件技术。"},
            {"id":3,"chapter":1,"type":"single","question":"属于软件开发技术第三阶段的是（）","options":["分布式系统","面向批处理","多用户","并行计算"],"answer":"A","explanation":"分布式系统属于第三阶段。"},
            {"id":4,"chapter":1,"type":"single","question":"下列属于线性模型的是（）","options":["瀑布模型","增量模型","螺旋模型","喷泉模型"],"answer":"A","explanation":"瀑布模型是典型的线性模型。"},
            {"id":5,"chapter":1,"type":"single","question":"具有风险分析的模型是（）","options":["瀑布模型","增量模型","螺旋模型","喷泉模型"],"answer":"C","explanation":"螺旋模型强调风险分析。"},
            {"id":6,"chapter":1,"type":"single","question":"确定软件系统\"做什么\"的是（）","options":["需求分析阶段","系统设计阶段","系统实现阶段","测试阶段"],"answer":"A","explanation":"需求分析阶段确定系统\"做什么\"。"},
            {"id":7,"chapter":1,"type":"single","question":"确定软件系统\"怎么做\"的是（）","options":["需求分析阶段","系统设计阶段","系统实现阶段","测试阶段"],"answer":"B","explanation":"系统设计阶段确定\"怎么做\"。"},
            {"id":8,"chapter":1,"type":"single","question":"数据库管理是（）","options":["维护工具","框架工具","分析与设计工具","支撑工具"],"answer":"D","explanation":"数据库管理属于支撑工具。"},
            {"id":9,"chapter":1,"type":"single","question":"属于支撑工具的是（）","options":["Rational ClearCase","操作系统","逆向工程工具","编译器"],"answer":"B","explanation":"操作系统属于支撑工具。"},
            {"id":10,"chapter":1,"type":"single","question":"调试器是（）","options":["程序设计工具","分析与设计工具","测试与分析工具","支撑工具"],"answer":"A","explanation":"调试器属于程序设计工具。"},
            {"id":11,"chapter":1,"type":"single","question":"软件配置管理工具属于（）","options":["支撑工具","程序设计工具","分析与设计工具","测试与分析工具"],"answer":"A","explanation":"配置管理工具属于支撑工具。"},
            {"id":12,"chapter":1,"type":"single","question":"属于维护工具的是（）","options":["代码的重构和分析工具","文档工具","数据库管理工具","质量保证工具"],"answer":"A","explanation":"代码重构和分析工具属于维护工具。"},
            {"id":13,"chapter":1,"type":"short","question":"请解释：软件危机","answer":"软件开发和维护过程中出现的一系列严重问题，主要表现为开发成本增加、进度难控制、质量难保证和维护困难。","category":"名词解释"},
            {"id":14,"chapter":1,"type":"short","question":"请解释：结构","answer":"系统内各组成要素之间相互联系、相互作用所形成的框架。","category":"名词解释"},
            {"id":15,"chapter":1,"type":"short","question":"请解释：框架工具","answer":"用于数据库管理、配置管理以及 CASE 工具集成的软件工具。","category":"名词解释"},
            {"id":16,"chapter":1,"type":"short","question":"请解释：工具集成","answer":"工具协作的程度。","category":"名词解释"},
            {"id":17,"chapter":1,"type":"short","question":"简述软件危机的主要体现。","answer":"1.软件开发成本日益增长；2.软件开发进度难以控制；3.软件质量难以保证；4.软件维护困难。","category":"简答题"},
            {"id":18,"chapter":1,"type":"short","question":"简述经典的软件工程思想将软件开发分为5个基本阶段。","answer":"1.需求分析：分析用户需求，明确系统应完成的功能和性能要求；2.系统设计：根据需求制定系统总体结构和详细设计方案；3.系统实现：按照设计方案进行程序编码和实现；4.测试：检测和纠正软件中的错误，验证软件是否满足需求；5.维护：软件投入运行后，对其进行修改、完善和升级。","category":"简答题"},
            {"id":19,"chapter":1,"type":"short","question":"简述软件开发过程的三种基本模型。","answer":"1.线性模型：按照固定顺序进行开发；2.增量模型：将系统划分为多个增量逐步实现；3.螺旋模型：以风险分析为核心，通过不断迭代完善软件系统。","category":"简答题"},
            {"id":20,"chapter":1,"type":"short","question":"简述结构化设计的步骤。","answer":"1.评审和细化数据流图；2.确定数据流图类型；3.映射软件模块结构；4.分解高层模块；5.优化模块结构；6.描述模块接口。","category":"简答题"},
            {"id":21,"chapter":2,"type":"single","question":"可行性分析是在需求分析的（）","options":["需求获取阶段","需求建模阶段","需求描述阶段","需求评审阶段"],"answer":"A","explanation":"可行性分析是在需求获取阶段进行的。"},
            {"id":22,"chapter":2,"type":"single","question":"确认测试计划制定是在（）","options":["需求分析阶段","软件设计阶段","软件测试阶段","软件维护阶段"],"answer":"A","explanation":"确认测试计划是在需求分析阶段制定的。"},
            {"id":23,"chapter":2,"type":"single","question":"结构化分析方法是面向（）","options":["过程的","数据流的","对象的","数据结构的"],"answer":"B","explanation":"结构化分析方法是面向数据流的。"},
            {"id":24,"chapter":2,"type":"single","question":"数据对象描述是用（）","options":["实体-关系图","数据流图","状态-迁移图","SC图"],"answer":"A","explanation":"数据对象描述使用实体-关系图。"},
            {"id":25,"chapter":2,"type":"single","question":"数据流图的核心是（）","options":["数据加工","数据源点","数据流","数据存储"],"answer":"A","explanation":"数据流图的核心是数据加工。"},
            {"id":26,"chapter":2,"type":"single","question":"顶层流图仅包含加工数目为（）","options":["1个","2个","3个","大于3个"],"answer":"A","explanation":"顶层流图仅包含1个加工。"},
            {"id":27,"chapter":2,"type":"single","question":"运用层次化数据流图建模的核心要点在于（）","options":["父图与子图的平衡","如何分层","如何分解","如何抽象"],"answer":"A","explanation":"层次化数据流图建模的核心是父图与子图的平衡。"},
            {"id":28,"chapter":2,"type":"single","question":"结构化设计中，过程设计来源于结构化分析的（）","options":["加工规格说明","数据流图","数据对象描述","控制规格说明"],"answer":"A","explanation":"过程设计来源于加工规格说明。"},
            {"id":29,"chapter":2,"type":"single","question":"结构化设计中，接口设计来源于结构化分析的（）","options":["加工规格说明","数据流图","数据对象描述","控制规格说明"],"answer":"B","explanation":"接口设计来源于数据流图。"},
            {"id":30,"chapter":2,"type":"single","question":"结构化分析中的状态迁移图对应于结构化设计的（）","options":["过程设计","接口设计","数据设计","体系结构设计"],"answer":"A","explanation":"状态迁移图对应于过程设计。"},
            {"id":31,"chapter":2,"type":"single","question":"结构化分析中的实体关系图对应于结构化设计的（）","options":["过程设计","接口设计","数据设计","体系结构设计"],"answer":"C","explanation":"实体关系图对应于数据设计。"},
            {"id":32,"chapter":2,"type":"single","question":"应停止模块分解的情况之一是当输入输出设备传送的信息是（）","options":["模块","流程","模块接口","模块调用"],"answer":"C","explanation":"当传送的信息是模块接口时应停止分解。"},
            {"id":33,"chapter":2,"type":"single","question":"可以表示嵌套设计的是（）","options":["流程图","数据流图","N-S图","IPO图"],"answer":"C","explanation":"N-S图可以表示嵌套设计。"},
            {"id":34,"chapter":2,"type":"single","question":"模块设计原则是（）","options":["高内聚高耦合","高内聚低耦合","低内聚高耦合","低内聚低耦合"],"answer":"B","explanation":"模块设计原则是高内聚低耦合。"},
            {"id":35,"chapter":2,"type":"short","question":"请解释：功能建模","answer":"用抽象模型的概念，按照软件内部数据传递、变换的关系，自顶向下逐层分解，直到找到满足功能要求的所有可实现的软件为止。","category":"名词解释"},
            {"id":36,"chapter":2,"type":"short","question":"请解释：传出模块","answer":"从上级模块获得数据，进行某些处理后将其传送给下属模块。它传送的数据流叫做逻辑输出数据流。","category":"名词解释"},
            {"id":37,"chapter":2,"type":"short","question":"请解释：传入模块","answer":"从下属模块取得数据，进行某些处理后将其传送给上级模块。它传送的数据流叫做逻辑输入数据流。","category":"名词解释"},
            {"id":38,"chapter":2,"type":"short","question":"请解释：协调模块","answer":"对所有下属模块进行协调和管理的模块。","category":"名词解释"},
            {"id":39,"chapter":2,"type":"short","question":"请解释：变换模块","answer":"从上级模块取得数据，进行特定的处理后将其转换成其他形式，再传送回上级模块。","category":"名词解释"},
            {"id":40,"chapter":2,"type":"short","question":"请解释：流程图","answer":"用规定的图形符号和连线表示算法或程序执行过程及控制关系的图形化工具。","category":"名词解释"},
            {"id":41,"chapter":2,"type":"short","question":"请解释：N-S图","answer":"N-S图也叫盒图，将全部算法写在一个矩形框内，在框内还可以包含其他从属于它的框。","category":"名词解释"},
            {"id":42,"chapter":2,"type":"short","question":"简述可行性研究的研究范围","answer":"通常从以下几个方面进行：1.经济可行性；2.技术可行性；3.法律可行性；4.用户操作可行性。","category":"简答题"},
            {"id":43,"chapter":2,"type":"short","question":"简述数据流图的组成元素","answer":"数据流图（DFD）的组成元素有4个：1.数据加工/数据处理：对输入的数据进行处理和变换，产生输出数据；2.数据流：表示数据的流动方向；3.数据存储：表示数据保存的场所；4.数据源点/数据终点/外部实体：表示系统之外的数据来源或数据去向。","category":"简答题"},
            {"id":44,"chapter":2,"type":"short","question":"简述结构化设计方法实施的步骤","answer":"1.研究、分析和审查数据流图，弄清数据加工过程，发现问题及时解决；2.根据数据流图确定数据处理类型：变换型或事务型；3.由数据流图推导出系统的初始结构图；4.运用启发式原则对初始结构图进行优化和改进；5.修改和补充数据字典；6.制订测试计划。","category":"简答题"},
            {"id":45,"chapter":2,"type":"short","question":"简述变换型数据处理过程","answer":"变换型数据处理过程一般包括三个阶段：1.取得数据（输入）：接收外部输入的数据；2.变换数据（中心变换）：对输入数据进行加工处理；3.给出数据（输出）：将处理结果输出给外部实体或数据存储。","category":"简答题"},
            {"id":46,"chapter":2,"type":"short","question":"学校领书流程的数据流图","answer":"![学校领书流程数据流图](images/非法书单.png)","category":"应用题"},
            {"id":47,"chapter":2,"type":"short","question":"商业销售事务处理统计软件包的数据流图","answer":"![商业销售统计软件包数据流图](images/订单记录文件.png)","category":"应用题"},
            {"id":48,"chapter":3,"type":"single","question":"对象的属性一般定义为（）","options":["私有的","共有的","保护的","包的"],"answer":"A","explanation":"对象的属性一般定义为私有的。"},
            {"id":49,"chapter":3,"type":"single","question":"学生对象属于（）","options":["角色","信息结构","组织机构","需要记忆的事件"],"answer":"A","explanation":"学生对象属于角色。"},
            {"id":50,"chapter":3,"type":"single","question":"属于外部实体的对象是（）","options":["用户","报表","击打键盘","学生"],"answer":"A","explanation":"用户属于外部实体。"},
            {"id":51,"chapter":3,"type":"single","question":"属于信息结构的对象是（）","options":["用户","报表","击打键盘","操作菜单"],"answer":"B","explanation":"报表属于信息结构。"},
            {"id":52,"chapter":3,"type":"single","question":"汽车与运货车是（）","options":["继承关系","组成关系","聚合关系","关联关系"],"answer":"A","explanation":"汽车与运货车是继承关系。"},
            {"id":53,"chapter":3,"type":"single","question":"多边形类和四边形类是（）","options":["泛化关系","组成关系","聚合关系","关联关系"],"answer":"A","explanation":"多边形类和四边形类是泛化关系。"},
            {"id":54,"chapter":3,"type":"single","question":"封装是（）","options":["一种信息隐蔽技术","一种共享技术","一种继承机制","一种冗余机制"],"answer":"A","explanation":"封装是一种信息隐蔽技术。"},
            {"id":55,"chapter":3,"type":"single","question":"不同对象:圆形、三角形和矩形，在接收到\"求面积\"这个消息的时候，将执行不同的操作(算法)来求各自的图形面积。属于（）","options":["多态","继承","隐蔽","组合"],"answer":"A","explanation":"这属于多态。"},
            {"id":56,"chapter":3,"type":"single","question":"动态绑定是一种（）","options":["多态性方法","多继承方法","信息隐蔽方法","容错方法"],"answer":"A","explanation":"动态绑定是一种多态性方法。"},
            {"id":57,"chapter":3,"type":"single","question":"描述协作的常见表示法，展示软件对象之间的消息流和有消息引出的方法调用的图是（）","options":["用例图","类图","顺序图","对象图"],"answer":"C","explanation":"顺序图描述对象间消息流。"},
            {"id":58,"chapter":3,"type":"single","question":"属于系统对象设计的是（）","options":["确认子系统","资源管理","增加协调者","数据管理设计"],"answer":"A","explanation":"确认子系统属于系统对象设计。"},
            {"id":59,"chapter":3,"type":"single","question":"属于系统体系结构设计的是（）","options":["人机界面设计","确认子系统","设计算法和数据结构","设计对象接口"],"answer":"A","explanation":"人机界面设计属于系统体系结构设计。"},
            {"id":60,"chapter":3,"type":"single","question":"UML 是一种（）","options":["建模语言","建模方法","建模软件","建模理论"],"answer":"A","explanation":"UML是一种建模语言。"},
            {"id":61,"chapter":3,"type":"single","question":"UML 中，描述系统功能的核心和其他视图的出发点的视图是（）","options":["用例视图","逻辑视图","进程视图","构件视图"],"answer":"A","explanation":"用例视图描述系统功能核心。"},
            {"id":62,"chapter":3,"type":"single","question":"逻辑视图描述使用的图有（）","options":["类图","构件图","用例图","部署图"],"answer":"A","explanation":"逻辑视图使用类图。"},
            {"id":63,"chapter":3,"type":"single","question":"进程视图描述使用的图有（）","options":["类图","构件图","用例图","对象图"],"answer":"B","explanation":"进程视图使用构件图。"},
            {"id":64,"chapter":3,"type":"single","question":"构件视图是（）","options":["描述系统代码的实现模块以及它们之间的依赖关系","描述系统的功能需求","描述如何实现系统内部的功能","描述系统的物理设备连接和哪个程序或对象驻留在哪台计算机上运行"],"answer":"A","explanation":"构件视图描述系统代码实现模块及依赖关系。"},
            {"id":65,"chapter":3,"type":"single","question":"下面哪个不属于 UML 中有三种基本构造块（）","options":["视图","事物","关系","图"],"answer":"A","explanation":"UML三种基本构造块不包括视图。"},
            {"id":66,"chapter":3,"type":"single","question":"依赖关系的图形表示是（）","options":["带实心箭头的虚线","带实心箭头的实线","带空心箭头的虚线","带空心箭头的实线"],"answer":"A","explanation":"依赖关系用带实心箭头的虚线表示。"},
            {"id":67,"chapter":3,"type":"single","question":"一个模型元素中构造型有（）","options":["1个","2个","3个","任意多个"],"answer":"A","explanation":"模型元素构造型数量是1个。"},
            {"id":68,"chapter":3,"type":"single","question":"单元测试的依据是（）","options":["用例图","类图","构件图","协作图"],"answer":"B","explanation":"单元测试依据是类图。"},
            {"id":69,"chapter":3,"type":"single","question":"集成测试的依据是（）","options":["用例图","类图","构件图","活动图"],"answer":"C","explanation":"集成测试依据是构件图。"},
            {"id":70,"chapter":3,"type":"short","question":"请解释：面向对象","answer":"面向对象（Object-Oriented，OO）= 对象（Object）+ 类（Class）+ 继承（Inheritance）+ 通信（Messages）。它是一种以对象为中心，通过对象之间的通信来完成程序功能的软件开发方法。","category":"名词解释"},
            {"id":71,"chapter":3,"type":"short","question":"请解释：对象","answer":"是具有明确语义边界的实体，是构成系统的基本单位，由属性和操作（方法）组成。","category":"名词解释"},
            {"id":72,"chapter":3,"type":"short","question":"请解释：消息","answer":"消息是面向对象系统中实现对象间交互的手段，是要求某个对象执行某个操作的规格说明，是对象之间相互请求或相互协作的途径。","category":"名词解释"},
            {"id":73,"chapter":3,"type":"short","question":"请解释：标记值","answer":"是用于描述模型元素特性、存储有关元素任意相关信息的字符串，是对模型元素附加信息的定义，包括模型元素和视图元素。","category":"名词解释"},
            {"id":74,"chapter":3,"type":"short","question":"请解释：约束","answer":"是用文字表达的规则，用于扩展模型元素的语义，规定模型元素必须满足的条件、限制或关系，否则模型无效。","category":"名词解释"},
            {"id":75,"chapter":3,"type":"short","question":"请解释：RUP","answer":"是一种迭代式的软件开发过程模型，它将软件开发划分为初始、细化、构造和移交四个阶段，通过工作流和迭代组织开发活动。","category":"名词解释"},
            {"id":76,"chapter":3,"type":"short","question":"简述面向对象方法的优秀特性","answer":"（1）抽象性：对象的数据抽象和行为抽象。（2）封装性：为信息隐蔽提供具体的实现手段。用户只要了解对象的功能描述即可。（3）共享性：同一类中所有实例共享数据结构和行为特征；同一应用中所有实例通过继承共享数据结构和行为特征；不同应用中所有实例通过复用共享数据结构和行为特征。","category":"简答题"},
            {"id":77,"chapter":3,"type":"short","question":"简述类和对象的区别和联系","answer":"（1）类包含了对象的所有属性和方法，它是对象的模板；对象是类的实例，可以由一个类制造出多个实例。（2）当创建了类以后，可以从这个类创建任意多个对象；当创建了一个类的实例后，系统将为这个类的实例变量分配内存。（3）类本身并不完成任何操作，它只是定义对象的属性及操作，实际的操作是由它所实例化的对象来完成的。","category":"简答题"},
            {"id":78,"chapter":3,"type":"short","question":"简述面向对象方法的优点","answer":"（1）稳定性好：较小的需求变化不会导致大的系统结构改变。（2）易于理解：面向对象的模型对现实的映射更直观，更有对应关系。（3）适用性强：能更好地适应用户需求的变化。（4）可靠性高：利用面向对象技术开发的系统具有更高的可靠性。","category":"简答题"},
            {"id":79,"chapter":3,"type":"short","question":"简述 UML 的公共机制","answer":"UML 的公共机制包括规格说明、修饰、公共划分和扩展机制。其中扩展机制由构造型、标记值和约束三部分组成，用于扩展 UML 的表达能力。","category":"简答题"},
            {"id":80,"chapter":3,"type":"short","question":"简述 UML 的主要特点","answer":"（1）UML统一了各种方法对不同类型的系统、不同的开发阶段以及不同内部概念的观点，从而有效消除了各种建模语言之间许多不必要的差异。（2）UML的建模能力比其他面向对象建模方法更强，适合并行、分布式系统。（3）UML是一种建模语言，但不是一个开发过程。","category":"简答题"},
            {"id":81,"chapter":4,"type":"single","question":"面向对象方法首要的核心任务是建立（）","options":["用例图","部署图","类图","构件图"],"answer":"A","explanation":"面向对象方法首要的核心任务是建立用例模型，用例图是其主要图形工具。"},
            {"id":82,"chapter":4,"type":"single","question":"影响项目进展的因素的调查研究中，需求分析遇到的问题的占比为（）","options":["12%","27%","37%","47%"],"answer":"C","explanation":"需求分析遇到的问题占比为37%。"},
            {"id":83,"chapter":4,"type":"single","question":"需求分析时人性化因素属于（）","options":["功能性","可用性","可靠性","可支持性"],"answer":"B","explanation":"人性化因素属于可用性。"},
            {"id":84,"chapter":4,"type":"single","question":"需求分析时安全性属于（）","options":["功能性","可用性","可靠性","可支持性"],"answer":"A","explanation":"安全性属于功能性需求。"},
            {"id":85,"chapter":4,"type":"single","question":"属于可靠性的是（）","options":["可预测性","安全性","有效性","准确性"],"answer":"A","explanation":"可预测性属于可靠性。"},
            {"id":86,"chapter":4,"type":"single","question":"用例模型中最主要的图形工具是用例图，有时也用（）","options":["活动图","类图","构件图","对象图"],"answer":"A","explanation":"用例模型中有时也使用活动图。"},
            {"id":87,"chapter":4,"type":"single","question":"用例用的符号是（）","options":["椭圆形符号","矩形符号","正方形符号","棱形符号"],"answer":"A","explanation":"用例使用椭圆形符号表示。"},
            {"id":88,"chapter":4,"type":"single","question":"下面正确用例名称的是（）","options":["借书","书","故事书","历史书"],"answer":"A","explanation":"用例名称应该是一个动词短语，\"借书\"是正确的用例名称。"},
            {"id":89,"chapter":4,"type":"single","question":"用例表示为（）","options":["椭圆","矩形","包含用例名称的椭圆","包含用例名称的矩形"],"answer":"C","explanation":"用例表示为包含用例名称的椭圆。"},
            {"id":90,"chapter":4,"type":"single","question":"用例中的行为者描述（）","options":["谁来做","做什么","如何做","为谁做"],"answer":"A","explanation":"行为者描述\"谁来做\"，即谁与系统进行交互。"},
            {"id":91,"chapter":4,"type":"single","question":"每个行为者可以参与的用例数是（）","options":["1 个","2 个","1 个或多个","多个"],"answer":"C","explanation":"每个行为者可以参与1个或多个用例。"},
            {"id":92,"chapter":4,"type":"single","question":"行为者代表的是（）","options":["一种角色","具体某个人","子系统","一个实现"],"answer":"A","explanation":"行为者代表的是一种角色，而不是具体的人。"},
            {"id":93,"chapter":4,"type":"single","question":"在系统开发阶段的用例是（）","options":["业务用例","系统用例","角色用例","行为用例"],"answer":"A","explanation":"在系统开发阶段使用业务用例。"},
            {"id":94,"chapter":4,"type":"single","question":"在系统构造阶段的用例是（）","options":["业务用例","系统用例","角色用例","行为用例"],"answer":"B","explanation":"在系统构造阶段使用系统用例。"},
            {"id":95,"chapter":4,"type":"single","question":"借阅书籍用例与权限认证用例之间的关系是（）","options":["包含关系","扩展关系","继承关系","组合关系"],"answer":"A","explanation":"借阅书籍必须进行权限认证，属于包含关系。"},
            {"id":96,"chapter":4,"type":"single","question":"归还书籍用例与交罚金用例之间的关系是（）","options":["扩展关系","包含关系","继承关系","组合关系"],"answer":"A","explanation":"归还书籍时可能需要交罚金，属于扩展关系。"},
            {"id":97,"chapter":4,"type":"short","question":"请解释：系统边界","answer":"系统元素与系统以外的事物的分界线。","category":"名词解释"},
            {"id":98,"chapter":4,"type":"short","question":"请解释：行为者","answer":"在系统外部与系统交互的实体。","category":"名词解释"},
            {"id":99,"chapter":4,"type":"short","question":"请解释：包含关系","answer":"包含关系可以看作一种特殊的依赖关系。","category":"名词解释"},
            {"id":100,"chapter":4,"type":"short","question":"请解释：场景","answer":"用例为了回应事件而采取的步骤，包括：基本事件流、备选事件流、异常事件流。","category":"名词解释"},
            {"id":101,"chapter":4,"type":"short","question":"简述需求分类","answer":"需求分为功能性需求和非功能性需求。非功能性需求包括系统性能、可靠性、可维护性等。","category":"简答题"},
            {"id":102,"chapter":4,"type":"short","question":"简述FURPS+","answer":"F（功能）：功能性需求；U（可用性）：人性化因素；R（可靠性）：可靠性需求；P（性能）：性能需求；S（支持性）：可支持性需求；+：接口、实现、法律等额外需求。","category":"简答题"},
            {"id":103,"chapter":4,"type":"short","question":"简述需求分析过程","answer":"1.问题识别；2.分析与综合；3.需求文档；4.验证评审。","category":"简答题"},
            {"id":104,"chapter":4,"type":"short","question":"简述行为者注意点","answer":"1.角色不是具体人；2.可泛化（继承）；3.分为主行为者和副行为者；4.分为主动行为者和被动行为者。","category":"简答题"},
            {"id":105,"chapter":4,"type":"short","question":"简述场景事件流","answer":"场景事件流包括三种：1.基本事件流：正常情况下的操作流程；2.备选事件流：可选的替代操作流程；3.异常事件流：出现异常时的处理流程。","category":"简答题"},
            {"id":106,"chapter":4,"type":"short","question":"电子投票系统用例图","answer":"投票机由一名监督员启动，为了将电子信息加载到投票机上，监督员必须输入验证码。电子信息是以文件的形式存储在服务器上的，该文件包含这次电子投票的标题以及每个职位的竞选信息。当信息加载到投票机上时，监督员审核这些信息，如果信息有误，监督员将终止该程序并重新加载数据；如果信息正确，监督员将再次输入验证码进行确认，此时投票可以开始。投票结束后，监督员审查结果并关闭机器。请根据描述画出该系统的用例图。![电子投票系统用例图](images/电子投票系统.png)","category":"应用题"},
            {"id":107,"chapter":4,"type":"short","question":"招生专业考试管理系统用例图","answer":"经与用户的沟通，确认某招生专业考试管理系统需包括的核心功能有：①专业考试评分，即提供评分专家现场评分。②考生基本信息处理，即对考生基本信息的录入、修改、删除等。③考生专业成绩处理，即对考生专业成绩（包括考试状态等）的录入、核对等。④专业考试合格证处理，即通过预测合格线等操作，最终确定专业考试合格线并打印合格证等。请根据描述画出该专业考试系统的用例图。![招生专业考试管理系统用例图](images/考试管理系统.png)","category":"应用题"},
            {"id":108,"chapter":5,"type":"single","question":"面向对象分析方法中描述事物的静态(状态)特性是用（）","options":["属性","方法","隐藏","继承"],"answer":"A","explanation":"属性描述事物的静态特性。"},
            {"id":109,"chapter":5,"type":"single","question":"面向对象分析方法中描述事物的动态行为是用（）","options":["方法","属性","多态","继承"],"answer":"A","explanation":"方法描述事物的动态行为。"},
            {"id":110,"chapter":5,"type":"single","question":"类图的设计属于（）","options":["数据管理部分的设计","问题空间部分的设计","人机交互部分的设计","任务管理部分的设计"],"answer":"A","explanation":"类图的设计属于数据管理部分的设计。"},
            {"id":111,"chapter":5,"type":"single","question":"类图、对象图用于描述系统中涉及的实体类和对象，属于（）","options":["逻辑视图","实现视图","部署视图","用例视图"],"answer":"A","explanation":"类图和对象图属于逻辑视图。"},
            {"id":112,"chapter":5,"type":"single","question":"用于描述系统所涉及的功能部件的是（）","options":["构件图","部署图","类图","对象图"],"answer":"A","explanation":"构件图用于描述系统所涉及的功能部件。"},
            {"id":113,"chapter":5,"type":"single","question":"对象名之后还可以标注构造这个对象的类的名称，中间隔开符号是（）","options":["冒号","逗号","分号","句号"],"answer":"A","explanation":"对象名与类名之间用冒号隔开，格式为 对象名:类名。"},
            {"id":114,"chapter":5,"type":"single","question":"用于分隔类名和包名符号是（）","options":["双冒号","冒号","双分号","分号"],"answer":"A","explanation":"类名和包名之间用双冒号(::)分隔。"},
            {"id":115,"chapter":5,"type":"single","question":"电脑与键盘的关系是（）","options":["聚集","继承","关联","组合"],"answer":"A","explanation":"电脑与键盘是聚集关系。"},
            {"id":116,"chapter":5,"type":"single","question":"公司与部门的关系是（）","options":["聚集","继承","关联","组合"],"answer":"D","explanation":"公司与部门是组合关系，部门是公司的组成部分。"},
            {"id":117,"chapter":5,"type":"single","question":"A 类是 B 类的方法中的一个参数，则 A 与 B 的关系是（）","options":["依赖","聚集","继承","关联"],"answer":"A","explanation":"A类作为B类方法的参数，属于依赖关系。"},
            {"id":118,"chapter":5,"type":"single","question":"员工和公司的关系是（）","options":["关联","继承","依赖","组合"],"answer":"A","explanation":"员工和公司是关联关系。"},
            {"id":119,"chapter":5,"type":"single","question":"实现关系在类图中是指（）","options":["接口和类的关系","对象和接口的关系","对象和类的关系","接口和接口的关系"],"answer":"A","explanation":"实现关系是指接口和类之间的关系。"},
            {"id":120,"chapter":5,"type":"single","question":"一个元素能被拥有的包的个数是（）","options":["1个","2个","3个","多个"],"answer":"A","explanation":"一个元素只能被一个包所拥有。"},
            {"id":121,"chapter":5,"type":"short","question":"运输工具类图：\"卡车\"类和\"轿车\"类的父类是\"汽车\"类，\"汽车\"类和\"火车\"类的父类是\"车辆\"类，\"轮船\"类、\"车辆\"类、\"飞机\"类的父类是\"运输工具\"类。请根据描述画出类图。","answer":"![运输工具类图](images/运输工具.png)","category":"应用题"},
            {"id":122,"chapter":5,"type":"short","question":"公司部门对象图：某公司的部门分组情况如下：c是Company类的对象，这个对象与d1、d2、d3、d4连接，d1、d2、d3、d4都是Department类的对象，它们具有不同的属性值，即有不同的名字。d1和d4连接，d4是d1的一个实例。请根据描述画出对象图。","answer":"![公司部门对象图](images/company.png)","category":"应用题"},
            {"id":123,"chapter":5,"type":"short","question":"进销存包图：\"进销存\"包是\"企业综合系统\"包中的一个子系统，这个子系统下还有4个内嵌套的子包：\"原材料购进管理\"子包、\"原材料存储管理\"子包、\"产成品存储管理\"子包和\"销售管理\"子包。其中，\"原材料存储管理\"子包依赖于\"原材料购进管理\"子包；\"销售管理\"子包依赖于\"产成品存储管理\"子包。请用两种表示方法画出包的嵌套关系。","answer":"表示法一：![嵌套包图表示法一](images/嵌套图1.png)表示法二：![嵌套包图表示法二](images/嵌套图2.png)","category":"应用题"},
            {"id":124,"chapter":6,"type":"single","question":"常被统为交互图的是时序图和（）","options":["协作图","状态图","活动图","用例图"],"answer":"A","explanation":"时序图和协作图统称为交互图。"},
            {"id":125,"chapter":6,"type":"single","question":"消息格式中序号必不可缺少的图是（）","options":["协作图","状态图","活动图","用例图"],"answer":"A","explanation":"协作图中消息格式需要序号来表示顺序。"},
            {"id":126,"chapter":6,"type":"single","question":"时序图的水平轴表示（）","options":["对象","时间","事件","消息"],"answer":"A","explanation":"时序图水平轴表示不同的对象。"},
            {"id":127,"chapter":6,"type":"single","question":"时序图的时间表示是用（）","options":["垂直轴","水平轴","消息的序号","对象的顺序"],"answer":"A","explanation":"时序图用垂直轴表示时间。"},
            {"id":128,"chapter":6,"type":"single","question":"时序图的对象名和类名之间用（）","options":["冒号隔开","逗号隔开","分号隔开","句号隔开"],"answer":"A","explanation":"对象名和类名之间用冒号隔开，格式为 对象名:类名。"},
            {"id":129,"chapter":6,"type":"single","question":"时序图如果要撤销对象，只要在其生命线终止点放置一个（）","options":["X","，","。","."],"answer":"A","explanation":"撤销对象用X符号标记在生命线终止点。"},
            {"id":130,"chapter":6,"type":"single","question":"用于描述相互合作的对象间的交互关系和链接关系的图是（）","options":["协作图","时序图","活动图","状态图"],"answer":"A","explanation":"协作图用于描述对象间的交互关系和链接关系。"},
            {"id":131,"chapter":6,"type":"single","question":"表示参与协作执行的对象的描述是（）","options":["类元角色","关联角色","执行角色","动作角色"],"answer":"A","explanation":"类元角色表示参与协作执行的对象。"},
            {"id":132,"chapter":6,"type":"single","question":"表示该对象在协作期被创建并被撤销的是（）","options":["{transinet}","{destroy}","{create}","{temporary}"],"answer":"A","explanation":"{transinet}表示对象在协作期被创建并被撤销。"},
            {"id":133,"chapter":6,"type":"single","question":"在状态图中实心圆表示（）","options":["起始状态","中间状态","瞬时状态","结束状态"],"answer":"A","explanation":"实心圆表示起始状态。"},
            {"id":134,"chapter":6,"type":"single","question":"在状态图中结束状态的图符是（）","options":["一个实心圆","一个空心圆","一个空心圆套一个实心圆","两个空心圆"],"answer":"C","explanation":"结束状态用一个空心圆套一个实心圆表示。"},
            {"id":135,"chapter":6,"type":"single","question":"在状态图一侧为凸尖角的多边形表示（）","options":["发出信号图符","接受信号图符","开始信号图符","结束信号图符"],"answer":"A","explanation":"凸尖角多边形表示发出信号图符。"},
            {"id":136,"chapter":6,"type":"single","question":"具有原子性的事件是（）","options":["entry事件","do事件","include事件","变化事件"],"answer":"A","explanation":"entry事件具有原子性。"},
            {"id":137,"chapter":6,"type":"single","question":"可以中断的事件是（）","options":["do事件","entry事件","include事件","变化事件"],"answer":"A","explanation":"do事件是可以中断的。"},
            {"id":138,"chapter":6,"type":"short","question":"请解释：时序图","answer":"时序图存在两个轴：水平轴表示不同的对象，垂直轴表示时间。时序图中包括的建模元素主要有对象、生命线、激活、消息等。","category":"名词解释"},
            {"id":139,"chapter":6,"type":"short","question":"请解释：生命线","answer":"生命线是时序图中表示对象在交互过程中存在期间的一条垂直虚线。","category":"名词解释"},
            {"id":140,"chapter":6,"type":"short","question":"请解释：激活","answer":"激活表示该对象被占用以完成某个任务。","category":"名词解释"},
            {"id":141,"chapter":6,"type":"short","question":"请解释：去激活","answer":"去激活指的是对象处于空闲状态，在等待消息。","category":"名词解释"},
            {"id":142,"chapter":6,"type":"short","question":"请解释：动作","answer":"动作是可执行的基本功能单元，可能要计算一个设置属性值或返回值的表达式，也可能要调用一个对象的操作，发送一个信号给对象，创建或撤销一个对象等。","category":"名词解释"},
            {"id":143,"chapter":6,"type":"short","question":"请解释：控制流","answer":"控制流是指当一个动作或活动结点结束时，马上进入下一个动作或活动结点的流程。","category":"名词解释"},
            {"id":144,"chapter":6,"type":"short","question":"简述消息的格式。","answer":"消息由操作名和参数表组成，并可附加序号、警戒条件、重复次数和回送值表等信息，以描述对象间的通信过程。","category":"简答题"},
            {"id":145,"chapter":6,"type":"short","question":"简述根据过程控制流来划分消息的分类。","answer":"1.简单消息（Simple Message）：表示简单的控制流，只说明控制权在对象间传递，不描述通信细节。\n2.同步消息（Synchronous Message）：表示嵌套控制流。发送者发出消息后必须等待接收者处理完成并返回结果，之后才能继续执行自己的操作。\n3.异步消息（Asynchronous Message）：表示异步控制流。发送者发出消息后无需等待返回结果，可立即继续执行自己的操作，常用于并发行为的描述。\n4.返回消息（Return Message）：表示控制流从被调用对象返回给调用者，用于返回操作执行结果。","category":"简答题"},
            {"id":146,"chapter":6,"type":"short","question":"简述时序图与协作图之间的区别。","answer":"1.侧重点不同：时序图强调对象之间消息传递的时间顺序；协作图强调对象之间的组织结构和链接关系。\n2.对象关系表示不同：协作图必须显示对象之间的链接；时序图一般不显示对象间的链接关系。\n3.对象生命周期表示不同：时序图能够表示对象的创建和销毁过程；协作图不便直接表示。\n4.对象激活情况表示不同：时序图能够清晰表示对象的激活与去激活状态；协作图无法清晰表示。","category":"简答题"},
            {"id":147,"chapter":6,"type":"short","question":"信用管理数据库时序图：当登录画面接收到请求登录的消息后，立即向\"信用管理数据库\"对象发送\"检查信用\"请求。\"信用管理数据库\"对象接收到消息后，同时发出两条带警戒条件的消息：一条发送给\"黑名单\"对象，警戒条件为\"如果信用值为负，则创建黑名单\"；另一条发送给\"会员\"对象，其警戒条件为\"如果信用值为正，则创建会员\"。请根据描述画出时序图。","answer":"![信用管理数据库时序图](images/信用管理数据库.png)","category":"应用题"},
            {"id":148,"chapter":6,"type":"short","question":"合同管理员时序图：当\"图形显示：用户接口\"对象接收到\"合同管理员\"对象发来的\"显示履约率\"消息后，立即向\"饼形图显示\"对象发送\"显示饼形图\"消息。\"饼形图显示\"对象接收到消息后，根据约束{b-a<5sec}的要求，用5秒的时间显示当前合同履约率的饼形图。显示完饼形图后，根据约束{c-b<3sec}的要求延迟3秒，将\"显示柱形图\"消息发送到\"柱形图显示\"对象。\"柱形图显示\"对象接收到消息后显示柱形图。请根据描述绘制时序图。","answer":"![合同管理员时序图](images/合同管理员.png)","category":"应用题"},
            {"id":149,"chapter":6,"type":"short","question":"还书活动图：图书馆里系统中还书活动时，先进行条件判定，若超时条件为真，则进行罚款，否则与罚款后的控制流合并，最终更新书本信息。请根据描述绘制活动图。","answer":"![还书活动图](images/更新书本.png)","category":"应用题"},
            {"id":150,"chapter":6,"type":"short","question":"车站候车厅活动图：进入车站候车厅前的活动描述如下：首先到达车站，此时需要分别检查行李和车票，这两项检查是同时进行的，当两个活动都达到下一个状态后才能进行下一个活动即进入候车室。请根据描述绘制活动图。","answer":"![车站候车厅活动图](images/到达车站.png)","category":"应用题"},
            {"id":151,"chapter":7,"type":"single","question":"UML逻辑建模涉及系统的功能，采用分类描述的图是（）","options":["包图","类图","对象图","状态图"],"answer":"A","explanation":"包图用于UML逻辑建模中分类描述系统功能。"},
            {"id":152,"chapter":7,"type":"single","question":"动态建模属于（）","options":["逻辑体系结构建模","物理体系结构建模","实现过程中的建模","与物理结构相关的建模"],"answer":"A","explanation":"动态建模属于逻辑体系结构建模。"},
            {"id":153,"chapter":7,"type":"single","question":"描述系统在实现过程中的建模的图是（）","options":["构件图/部署图","对象图","状态图","包图"],"answer":"A","explanation":"构件图和部署图描述系统在实现过程中的建模。"},
            {"id":154,"chapter":7,"type":"single","question":"部署图是描述系统在（）","options":["实现过程中的建模","分析过程中的建模","设计过程中的建模","规划过程中的建模"],"answer":"A","explanation":"部署图描述系统在实现过程中的建模。"},
            {"id":155,"chapter":7,"type":"single","question":"不需要转换成可执行的系统是（）","options":["包","类图","对象图","状态图"],"answer":"A","explanation":"包不需要转换成可执行的系统。"},
            {"id":156,"chapter":7,"type":"single","question":"部署图可以（）","options":["描述业务活动中的组织机构和资源","用来进行业务建模","在分析过程中的建模","在设计过程中的建模"],"answer":"A","explanation":"部署图可以描述业务活动中的组织机构和资源。"},
            {"id":157,"chapter":7,"type":"single","question":"用来描述业务过程的是（）","options":["构件图","部署图","包图","用例图"],"answer":"A","explanation":"构件图用来描述业务过程。"},
            {"id":158,"chapter":7,"type":"single","question":"下列符号属于二进制代码构件的是（）","options":["《library》","《application》","《document》","《file》"],"answer":"A","explanation":"《library》属于二进制代码构件。"},
            {"id":159,"chapter":7,"type":"single","question":"《document》是表示（）","options":["源代码构件","二进制代码构件","可执行程序构件","一个可执行程序"],"answer":"A","explanation":"《document》表示源代码构件。"},
            {"id":160,"chapter":7,"type":"single","question":"一个系统只有一个（）","options":["部署图","用例图","包图","类图"],"answer":"A","explanation":"一个系统只有一个部署图。"},
            {"id":161,"chapter":7,"type":"single","question":"用于建立系统的静态实现视图模型的是（）","options":["构件图","部署图","包图","用例图"],"answer":"A","explanation":"构件图用于建立系统的静态实现视图模型。"},
            {"id":162,"chapter":7,"type":"single","question":"在运行时表示计算资源的物理元素（）","options":["节点","类","对象","进程"],"answer":"A","explanation":"节点是在运行时表示计算资源的物理元素。"},
            {"id":163,"chapter":7,"type":"short","question":"请解释：逻辑建模","answer":"逻辑建模，又称逻辑体系结构建模，涉及系统的功能，它把功能分配到系统的不同部分并详细地指明解决方案是如何工作的。","category":"名词解释"},
            {"id":164,"chapter":7,"type":"short","question":"请解释：构件图","answer":"构件图描述系统中不同物理构件及其相互之间的联系，表达系统代码本身的结构。","category":"名词解释"},
            {"id":165,"chapter":7,"type":"short","question":"请解释：部署图","answer":"部署图由节点构成，节点代表系统的硬件，构件在节点上驻留并执行。","category":"名词解释"},
            {"id":166,"chapter":7,"type":"short","question":"请解释：构件","answer":"构件（Component）是定义了良好接口的物理实现单元，是系统中可替换的物理部件。","category":"名词解释"},
            {"id":167,"chapter":7,"type":"short","question":"请解释：节点","answer":"节点（Node）是在运行时表示计算资源的物理元素。","category":"名词解释"},
            {"id":168,"chapter":7,"type":"short","question":"简述逻辑模型的作用。","answer":"（1）指出系统应该具有的功能。（2）指出为完成这些功能要涉及哪些类，这些类之间如何相互联系。（3）说明类和它们的对象如何协作才能实现这些功能。（4）指明系统中各功能实现的先后顺序。（5）根据逻辑体系结构模型，制定出相应的开发进度计划。","category":"简答题"},
            {"id":169,"chapter":7,"type":"short","question":"简述实现模型的作用。","answer":"（1）指出系统中的类和对象在物理上位于哪个程序或进程。（2）程序或进程依赖哪台具体计算机运行。（3）标明系统中配置的计算机和其他硬件设备。（4）指明系统中各种计算机和硬件设备如何进行连接。（5）明确不同的代码文件之间的相互依赖关系。（6）当一个文件被改变时，标明哪些相关文件需要重新编译。","category":"简答题"},
            {"id":170,"chapter":7,"type":"short","question":"简述构件图包含的元素。","answer":"构件图主要由构件、接口和依赖关系三部分组成，用于描述系统的物理结构及构件之间的相互依赖关系。","category":"简答题"},
            {"id":171,"chapter":7,"type":"short","question":"简述构件图建模步骤。","answer":"（1）对系统中的构件建模。（2）对相应构件提供的接口建模。（3）对构件之间的依赖关系建模。（4）将逻辑设计映射成物理实现。（5）对建模的结果进行精化和细化。","category":"简答题"},
            {"id":172,"chapter":7,"type":"short","question":"投票系统构件图：设某投票系统有4个明显的业务构件，即职位信息、候选人信息、投票人信息和投票信息。这几个构件都被标识为Java Bean类型；三个基本的界面构件，身份验证、查询信息和投票界面，被标识为Html+CSS类型；一个控制构件\"投票处理\"来实现，该构件被标识为Struts Action类型。各个构件之间具体的依赖关系：三个界面构件都必须依赖于投票处理构件以实现其构件定义的功能，并且投票界面构件还必须依赖于身份验证界面构件。其次，投票处理构件需要依赖投票信息构件；投票信息依赖于职位、候选人、投票人信息构件。请根据描述画出构件图。","answer":"![投票系统构件图](images/投票人信息.png)","category":"应用题"},
            {"id":173,"chapter":10,"type":"single","question":"与软件体系结构设计不同，设计模式的设计（）","options":["粒度更粗","粒度更细","更抽象","更偏向分析"],"answer":"B","explanation":"设计模式的设计粒度更细。"},
            {"id":174,"chapter":10,"type":"single","question":"设计模式背后的一个观点就是软件系统的质量（）","options":["可以客观度量","可以主观度量","不能描述","不能共识"],"answer":"A","explanation":"软件系统的质量可以客观度量。"},
            {"id":175,"chapter":10,"type":"single","question":"处理类或对象的组合的设计模式是（）","options":["创建型","结构型","行为型","动态型"],"answer":"B","explanation":"结构型模式处理类或对象的组合。"},
            {"id":176,"chapter":10,"type":"single","question":"下列属于结构型模式的是（）","options":["适配器模式","备忘录模式","状态模式","访问者模式"],"answer":"A","explanation":"适配器模式属于结构型模式。"},
            {"id":177,"chapter":10,"type":"single","question":"下列属于创建型模式的是（）","options":["工厂方法模式","备忘录模式","状态模式","访问者模式"],"answer":"A","explanation":"工厂方法模式属于创建型模式。"},
            {"id":178,"chapter":10,"type":"single","question":"下列属于行为型模式的是（）","options":["迭代器模式","桥接模式","单例模式","原型模式"],"answer":"A","explanation":"迭代器模式属于行为型模式。"},
            {"id":179,"chapter":10,"type":"single","question":"开闭原则指一个软件实体应该（）","options":["对扩展开放，对修改关闭","对扩展关闭，对修改开放","对扩展开放，对修改开放","对扩展关闭，对修改关闭"],"answer":"A","explanation":"开闭原则：对扩展开放，对修改关闭。"},
            {"id":180,"chapter":10,"type":"single","question":"开闭原则的关键是（）","options":["抽象化","具体化","实例化","动态化"],"answer":"A","explanation":"开闭原则的关键是抽象化。"},
            {"id":181,"chapter":10,"type":"single","question":"桥接模式就是（）","options":["把抽象部分与实现部分分离","把抽象部分与实现部分连接","把整体与部分分离","把整体与部分整合"],"answer":"A","explanation":"桥接模式把抽象部分与实现部分分离。"},
            {"id":182,"chapter":10,"type":"single","question":"基于构件的开发模型融合了（）","options":["螺旋模型","瀑布模型","增量模型","线性模型"],"answer":"A","explanation":"基于构件的开发模型融合了螺旋模型。"},
            {"id":183,"chapter":10,"type":"single","question":"基于体系结构的开发模型的核心是（）","options":["软件体系结构","构件","节点","类"],"answer":"A","explanation":"基于体系结构的开发模型的核心是软件体系结构。"},
            {"id":184,"chapter":10,"type":"short","question":"请解释：模式名称","answer":"即用一两个词来描述模式的问题、解决方案和效果。命名一个新的模式直接地增加了我们的设计词汇。","category":"名词解释"},
            {"id":185,"chapter":10,"type":"short","question":"请解释：单一职责原则","answer":"单一职责原则表示一个类只负责一项职责，不能将太多职责放在一个类中。","category":"名词解释"},
            {"id":186,"chapter":10,"type":"short","question":"请解释：工厂方法模式","answer":"工厂方法模式定义一个用于创建对象的接口，让子类决定实例化哪一个类。","category":"名词解释"},
            {"id":187,"chapter":10,"type":"short","question":"请解释：组合模式","answer":"组合模式又叫部分-整体模式，其关键是一个抽象类，它既可以代表图元，又可以代表图元的容器。","category":"名词解释"},
            {"id":188,"chapter":10,"type":"short","question":"请解释：迭代器模式","answer":"迭代器模式就是顺序访问一个聚集对象中的各个元素，而不暴露该对象的内部表示。","category":"名词解释"},
            {"id":189,"chapter":10,"type":"short","question":"简述一个模式的基本要素。","answer":"1.模式名称（Pattern Name）：用来描述模式的问题、解决方案和效果，便于交流和复用设计经验。\n2.问题（Problem）：描述在什么情况下使用该模式，即模式所适用的环境、需要解决的问题以及使用模式必须满足的条件。\n3.解决方案（Solution）：描述设计的组成部分、类与对象之间的关系、职责以及协作方式，给出解决问题的通用设计方案。\n4.效果（Consequences）：描述模式应用后的结果，以及使用该模式的优点、缺点和影响。","category":"简答题"},
            {"id":190,"chapter":10,"type":"short","question":"简述设计模式的特征。","answer":"（1）简单性：只包含少数几个类。（2）灵巧性：精巧并能解决实际问题。（3）验证性：已经在若干个实际运行的系统中成功地完成测试验证。（4）通用性：在各种系统设计中可以解决同类问题。（5）复用性：可在各种系统的各个层次的系统设计中反复使用。","category":"简答题"},
            {"id":191,"chapter":10,"type":"short","question":"简述根据使用目的设计模式的分类。","answer":"根据使用目的，设计模式分为创建型模式、结构型模式和行为型模式三类，分别关注对象创建、对象组合以及对象间的交互与职责分配。","category":"简答题"},
            {"id":192,"chapter":10,"type":"short","question":"简述设计模式的原则。","answer":"设计模式遵循七大原则：单一职责原则、开闭原则、里氏替换原则、依赖倒置原则、接口隔离原则、迪米特法则和合成/聚合复用原则。这些原则的核心目标是高内聚、低耦合，提高系统的可扩展性、可维护性和复用性。","category":"简答题"},
            {"id":193,"chapter":10,"type":"short","question":"简述基于体系结构的开发阶段。","answer":"基于体系结构的开发模型将软件生命周期划分为软件定义、需求分析和定义、体系结构设计、软件系统设计、软件实现五个阶段，并以软件体系结构为核心指导整个开发过程。","category":"简答题"}
        ];
        console.log('内嵌题库加载成功，共', this.data.questions.length, '道题');
    },

    loadEmbeddedSPMData() {
        this.data.chapters = [{"id":1,"name":"软件项目管理","icon":"📋"}];
        this.data.questions = [
            {"id":1,"chapter":1,"type":"single","question":"有效的项目管理集中在对3P 的管理中，包括____问题和过程的管理。","options":["人员","时间","成本","质量"],"answer":"A","explanation":"正确答案为A。"},
            {"id":2,"chapter":1,"type":"single","question":"____是项目的灵魂人物，其能力有时直接影响了项目的成败。","options":["技术人员","项目负责人","程序员","项目经理"],"answer":"D","explanation":"正确答案为D。"},
            {"id":3,"chapter":1,"type":"single","question":"____是尽量通过数据说明问题、解释问题、找出问题产生的根本原因。","options":["阶段化管理","优化管理","量化管理","过程人管理"],"answer":"C","explanation":"正确答案为C。"},
            {"id":4,"chapter":1,"type":"single","question":"影响软件项目可行性的因素包括____技术可行性、风险和不确定性。","options":["社会可行性","软件可行性","经济可行性","环境可行性"],"answer":"C","explanation":"正确答案为C。"},
            {"id":5,"chapter":1,"type":"single","question":"回收期是使累计的____流入等于最初的投资费用所需的时间。","options":["净现金","净现值","净利润","净收益"],"answer":"A","explanation":"正确答案为A。"},
            {"id":6,"chapter":1,"type":"single","question":"瀑布模型将软件生命周期划分为软件计划____软件设计、软件实现、软件测试、软 件运行和维护这6 个阶段。","options":["软件分析","需求分析与设计","可行性分析","功能分析与设计"],"answer":"B","explanation":"正确答案为B。"},
            {"id":7,"chapter":1,"type":"single","question":"敏捷开发模型Scrum 中的三个角色有产品负责人____开发团队。","options":["程序员","项目负责人","需求分析员","Scrum Master"],"answer":"D","explanation":"正确答案为D。"},
            {"id":8,"chapter":1,"type":"single","question":"____是指积极参与项目或其利益在项目执行中或成功后受到积极或消极影响的组织和个 人。","options":["项目团队","项目负责人","项目经理","软件项目干系人"],"answer":"D","explanation":"正确答案为D。"},
            {"id":9,"chapter":1,"type":"single","question":"1956 年，美国杜邦公司在制定企业不同业务部门的系统规划，制定的网络计划，采用的 是哪种计划方法____。","options":["CPM","关键路径法","甘特图","PERT"],"answer":"D","explanation":"正确答案为D。"},
            {"id":10,"chapter":1,"type":"single","question":"PMBOK 将计划的过程分为2 个部分---____过程和辅助过程。","options":["重要","重点","核心","关键"],"answer":"C","explanation":"正确答案为C。"},
            {"id":11,"chapter":1,"type":"single","question":"考虑项目的4 大要素—范围、资源____和质量。","options":["精力","性能","时间","任务"],"answer":"C","explanation":"正确答案为C。"},
            {"id":12,"chapter":1,"type":"single","question":"____为了达到特定的里程碑，要去完成一系列活动。","options":["里程碑计划","目标计划","阶段性计划","项目计划"],"answer":"A","explanation":"正确答案为A。"},
            {"id":13,"chapter":1,"type":"single","question":"____通过策划各种质量相关活动来保证项目达到预期的质量目标。","options":["项目计划","规划计划","质量计划","审核计划"],"answer":"C","explanation":"正确答案为C。"},
            {"id":14,"chapter":1,"type":"single","question":"任何适用于项目的标准和规范，这也是对产品质量的要求或对产品功能的限制。____","options":["时间限制","质量目标","功能特性","标准和规范"],"answer":"D","explanation":"正确答案为D。"},
            {"id":15,"chapter":1,"type":"single","question":"质量计划要以预防为主，以____为主，从而降低软件开发过程中的缺陷。","options":["风险预防","缺陷预防","成本预防","进度预防"],"answer":"B","explanation":"正确答案为B。"},
            {"id":16,"chapter":1,"type":"single","question":"软件规模估算中____是一种专家评估技术，适用于在没有或没有足够历史数据的情 况下来评定软件采用不同的技术或新技术所带的差异。","options":["代码行估算法","功能点估算法","标准构件法","德尔菲法"],"answer":"D","explanation":"正确答案为D。"},
            {"id":17,"chapter":1,"type":"single","question":"最简单、基本的软件规模估算是____","options":["德尔菲法","代码行估算法","功能点估算分析","综合讨论"],"answer":"B","explanation":"正确答案为B。"},
            {"id":18,"chapter":1,"type":"single","question":"____在需求分析阶段基于系统功能的一种规模估算方法。","options":["德尔菲法","代码行估算法","功能点估算分析","综合讨论"],"answer":"C","explanation":"正确答案为C。"},
            {"id":19,"chapter":1,"type":"single","question":"某个项目的估算结果是项目大概需要30 人月来完成，真正的解决方案是____","options":["1 个人做30 个月","3 个人做10 个月","5 个人做6 个月","10 个人做3 个月"],"answer":"C","explanation":"正确答案为C。"},
            {"id":20,"chapter":1,"type":"single","question":"____一种逐步完善的规划方式，对近期完成的工作进行细致规划，而对远期完成的工作 进行初步规划。","options":["专家评定","滚动式规划","使用模块","逐层分解"],"answer":"B","explanation":"正确答案为B。"},
            {"id":21,"chapter":1,"type":"single","question":"____是项目中完成阶段性工作的标志，标志着上一个阶段结束，下一个阶段开始，将一 个过程性的任务用一个结论性的标志来描述，明确任务的起止点。","options":["关键点","检查点","里程碑","起始点"],"answer":"C","explanation":"正确答案为C。"},
            {"id":22,"chapter":1,"type":"single","question":"完成全部代码编写、单元测试和模块集成测试这样的目标是软件项目里程碑中的____ 活动名称。","options":["需求收集","需求分析","编程实现","系统测试"],"answer":"C","explanation":"正确答案为C。"},
            {"id":23,"chapter":1,"type":"single","question":"要想有效管理里程碑，应该注意重点关注、提前定期检查和____","options":["控制风险","分解项目","查明问题","及时总结"],"answer":"D","explanation":"正确答案为D。"},
            {"id":24,"chapter":1,"type":"single","question":"常用的制定进度计划的方法有关键路径法（CPM）____甘特图（GANNT）和表格表 示法。","options":["计划评审技术","网络图法","流程图法","遍历法"],"answer":"A","explanation":"正确答案为A。"},
            {"id":25,"chapter":1,"type":"single","question":"把整个网络图放在日历时间表上形成一个方便跟踪和管理的进度时间表，这种是____","options":["关键路径法（CPM）","甘特图（GANNT）","计划评审技术","表格表示法"],"answer":"B","explanation":"正确答案为B。"},
            {"id":26,"chapter":1,"type":"single","question":"进度和成本控制的基础还是计划____的计划是控制过程的基线。","options":["事先完成","事中完成","事后完成","总结"],"answer":"A","explanation":"正确答案为A。"},
            {"id":27,"chapter":1,"type":"single","question":"____源于精益生产实践，它把工作流程形象化，把工作细分，写在卡纸上，贴在状态 墙上，来显示任务在工作流程中的状况。","options":["敏捷管理","看板示例","累积流量","进度管理"],"answer":"B","explanation":"正确答案为B。"},
            {"id":28,"chapter":1,"type":"single","question":"____是科学地测量过程状态的基本的方法。","options":["软件质量保证","软件质量管理","软件质量控制","软件质量测量"],"answer":"C","explanation":"正确答案为C。"},
            {"id":29,"chapter":1,"type":"single","question":"审查相关文档是否采用了最新的模块，是否符合文档规范的要求是____角色的质量责 任。","options":["项目经理","系统分析员","编程人员","文档编写人员"],"answer":"D","explanation":"正确答案为D。"},
            {"id":30,"chapter":1,"type":"single","question":"检查表是一种常用的质量保证手段，也是正式技术评审的必要工具，评审过程往往由检 查表驱动。检查表具有的特征有____效率，不易过长等。","options":["可能性","每个缺陷类型指定多个代码","可靠性","以复杂问句的形式表达"],"answer":"C","explanation":"正确答案为C。"},
            {"id":31,"chapter":1,"type":"single","question":"____多用于需要文档评审，按照用户使用场景对产品/文档进行评审。","options":["检查表","走查","会议审查","场景分析技术"],"answer":"D","explanation":"正确答案为D。"},
            {"id":32,"chapter":1,"type":"single","question":"在会议最后，评审小组就评审内容进行最后讨论，形成评审结论。这是评审会议过程的 ____。","options":["召开会议","评审决议","问题跟踪","会议准备"],"answer":"B","explanation":"正确答案为B。"},
            {"id":33,"chapter":1,"type":"single","question":"____不局限于程序功能的问题，任何与用户需要不符合的地方都是缺陷。","options":["软件缺陷","缺陷预防","质量保证","缺陷分析"],"answer":"A","explanation":"正确答案为A。"},
            {"id":34,"chapter":1,"type":"single","question":"____指导怎么正确地做事，如何只做正确的事，了解哪些因素可能会引起缺陷，吸取 教训，不断总结经验，杜绝缺陷的产生。","options":["软件缺陷","缺陷预防","质量保证","缺陷分析"],"answer":"B","explanation":"正确答案为B。"},
            {"id":35,"chapter":1,"type":"single","question":"____是针对缺陷数目随时间而不断变化的趋势进行分析，了解缺陷的发现或修正的规 律性，而没有出现异常现象。","options":["缺陷组成分析","缺陷趋势分析","缺陷分布分析","缺陷类型分析"],"answer":"B","explanation":"正确答案为B。"},
            {"id":36,"chapter":1,"type":"single","question":"____是横向分析，针对缺陷在功能模块、缺陷类型、缺陷产生原因等不同方面的分布 情况。","options":["缺陷组成分析","缺陷趋势分析","缺陷分布分析","缺陷走向分析"],"answer":"C","explanation":"正确答案为C。"},
            {"id":37,"chapter":1,"type":"single","question":"使用____分析工具，可以更全面地探讨各种类型的原因。","options":["决策树","判定表","鱼骨图","PERT"],"answer":"C","explanation":"正确答案为C。"},
            {"id":38,"chapter":1,"type":"single","question":"强调风险管理必须是主动的、规范的，是不可缺少的管理过程，应持续评估、监控和管 理风险，直到风险被处理或消除是____风险管理模型。","options":["CMU/SEI","MSF","Riskit","Boehm"],"answer":"B","explanation":"正确答案为B。"},
            {"id":39,"chapter":1,"type":"single","question":"____指的是潜在预算、进度、人力、资源、客户、需求等方面的问题及其对软件项目 的影响。","options":["项目风险","需求风险","组织管理","人员风险"],"answer":"A","explanation":"正确答案为A。"},
            {"id":40,"chapter":1,"type":"single","question":"____来自于3 个方面—项目自身、组织和环境，不同的方面还可细分出具体风险因素。","options":["项目风险","需求风险","组织管理","人员风险"],"answer":"A","explanation":"正确答案为A。"},
            {"id":41,"chapter":1,"type":"single","question":"需求风险有可能是用户参与度不够，需求说明不清楚____客户的意见未被采纳等。","options":["财务管理水平不高","对计划不重视","和用户沟通困难","代码不够规范"],"answer":"C","explanation":"正确答案为C。"},
            {"id":42,"chapter":1,"type":"single","question":"有助于识别风险，既要了解风险识别的输入，包括____计划输出和历史资料等。","options":["财务管理","开发计划","用户需求","产品说明"],"answer":"D","explanation":"正确答案为D。"},
            {"id":43,"chapter":1,"type":"single","question":"风险识别的方法中常用的方法有____风险检查列表和风险库等。","options":["面谈","头脑风暴会议","调查表","需求风险"],"answer":"B","explanation":"正确答案为B。"},
            {"id":44,"chapter":1,"type":"single","question":"对于已经确认的风险通常可采取以下几种措施：保留风险____转移风险和避免风险。","options":["承担风险","减少风险","规避风险","评估风险"],"answer":"B","explanation":"正确答案为B。"},
            {"id":45,"chapter":1,"type":"single","question":"针对风险采取的措施分为技术、组织和____。","options":["管理性措施","经济性措施","保险措施","生产工艺措施"],"answer":"B","explanation":"正确答案为B。"},
            {"id":46,"chapter":1,"type":"single","question":"最小与最小对策（WT 对策），着重考虑____","options":["弱点因素和威胁因素","优势因素和威胁因素","弱点因素和机会因素","优势因素 和机会因素"],"answer":"A","explanation":"正确答案为A。"},
            {"id":47,"chapter":1,"type":"single","question":"良好的工作范围，概括起来为开放、真诚____信任。","options":["公平","公正","平等","温馨"],"answer":"C","explanation":"正确答案为C。"},
            {"id":48,"chapter":1,"type":"single","question":"马斯洛需求层次论把需求分成五类分别是生理需求、安全需求____尊重需求和自 我实现需求。","options":["权利需求","社会需求","亲和需求","成就需求"],"answer":"B","explanation":"正确答案为B。"},
            {"id":49,"chapter":1,"type":"single","question":"弗鲁姆的期望需求取决于目标价值和____和乘积。","options":["期望概率","期望水平","期望获取","激励力量"],"answer":"A","explanation":"正确答案为A。"},
            {"id":50,"chapter":1,"type":"single","question":"真正做到有效沟通，既要遵守上述的沟通原则，也要尽量主动积极沟通____ 是不属 于消除沟通常见的障碍。","options":["不敢和上级沟通","不要说“我以为”","不要对下属缺少热忱","不要忽视沟通技巧"],"answer":"A","explanation":"正确答案为A。"},
            {"id":51,"chapter":1,"type":"single","question":"员工管理常见的方式有管过程____管方向、管愿景。","options":["管人才","管数据","管结果","管财产"],"answer":"C","explanation":"正确答案为C。"},
            {"id":52,"chapter":1,"type":"single","question":"根据相关利益人的影响力及其项目的利益水平进行分类是常用的干系人分析方法____","options":["SWOT","影响力/利益矩阵","VERT 技术","关键链技术"],"answer":"B","explanation":"正确答案为B。"},
            {"id":53,"chapter":1,"type":"single","question":"____由麦肯锡咨询公司提出的、常用的分析方法，包括分析优势、劣势、机会和威胁","options":["SWOT","影响力/利益矩阵","VERT 技术","关键链技术"],"answer":"A","explanation":"正确答案为A。"},
            {"id":54,"chapter":1,"type":"single","question":"建立软件项目过程的基线，将获得的实际测量值与基线进行比较。基限指的是____","options":["上限和下限","平均期望值","上限","下限"],"answer":"A","explanation":"正确答案为A。"},
            {"id":55,"chapter":1,"type":"single","question":"项目成员按规定/要求发出项目的相关数据信息，之后由____或项目组长进行整理和分 析。","options":["技术工程师","项目组主要成员","项目经理","软件工程师"],"answer":"C","explanation":"正确答案为C。"},
            {"id":56,"chapter":1,"type":"single","question":"针对数据的质量需要注意数据的____及时性和有效性。","options":["可靠性","价值性","真实性","可行性"],"answer":"C","explanation":"正确答案为C。"},
            {"id":57,"chapter":1,"type":"single","question":"____的可视化主要针对维护过程中遇到的问题进行汇总和分析，最后将汇总的数据转换 成图形或表格之类的可视化结果。","options":["项目执行期","项目后期维护时期","项目收尾总结时期","项目计划时期"],"answer":"B","explanation":"正确答案为B。"},
            {"id":58,"chapter":1,"type":"single","question":"____是将收集到的项目实际进展信息与进度基准计划做比较，来判断项目是否偏离正常 的轨道。","options":["甘特图","计划与实际对比图","延迟图","燃尽图"],"answer":"B","explanation":"正确答案为B。"},
            {"id":59,"chapter":1,"type":"single","question":"管理软件开发的过程中，遇到多项目并行优先处理、任务和问题优先级处理以及协调工 作优先级处理3 个层面的____。","options":["优先级设定与处理","缺陷优先级和严重性","缺陷严重性","缺陷优先级"],"answer":"A","explanation":"正确答案为A。"},
            {"id":60,"chapter":1,"type":"single","question":"缺陷严重性有5 个级别，一般性错误，如界面错误，打印内容和格式错误是属于____ 级别。","options":["类","类","类","类"],"answer":"C","explanation":"正确答案为C。"},
            {"id":61,"chapter":1,"type":"single","question":"缺陷优先级分为4 个级别，立即修复，否则阻碍进一步测试是属于____级别。","options":["最高优先级","较高优先级","一般优先级","低优先级"],"answer":"A","explanation":"正确答案为A。"},
            {"id":62,"chapter":1,"type":"single","question":"软件开发项目中大多数的变更都是来源于____。","options":["需求变更","设计变更","代码变更","进度变更"],"answer":"A","explanation":"正确答案为A。"},
            {"id":63,"chapter":1,"type":"single","question":"在提交阶段，要对变更请求进行记录。根据请求起源和收集信息类型的不同，可以分为 新功能、功能增强、缺陷修正等不同类型的请求。这是变更控制流程的____。","options":["变更提交","变更接收","变更评估","变更实施"],"answer":"A","explanation":"正确答案为A。"},
            {"id":64,"chapter":1,"type":"single","question":"浏览所有新提交的变更请求，详细了解每个请求的特征，确定变更的优先级、影响范围 和所需的工作量，为下一步决策提供足够的数据信息。这是变更控制流程的____。","options":["变更提交","变更接收","变更评估","变更决策"],"answer":"C","explanation":"正确答案为C。"},
            {"id":65,"chapter":1,"type":"single","question":"自动构建、自动部署和自动测试是一个开发的最佳实践，是变更适应敏捷开发的____ 技术理念。","options":["构件/组件化","配置化设计理念","测试驱动开发","持续集成"],"answer":"D","explanation":"正确答案为D。"},
            {"id":66,"chapter":1,"type":"single","question":"整个收尾工作大体上可以分成项目验收和____两个过程。","options":["项目总结","总结会议","总结报告","功能检测"],"answer":"A","explanation":"正确答案为A。"},
            {"id":67,"chapter":1,"type":"single","question":"不管大小项目，项目承包访在正式验收之前，应该做到的是____","options":["详细的验收计划","完整的检查清单","准备好相关的开发文档和产品文档","优先 级排序"],"answer":"C","explanation":"正确答案为C。"},
            {"id":68,"chapter":1,"type":"single","question":"项目承包方验收项目之前，应准备好相关的开发文档和产品文档，开发文档包括《投标 方案》《需求分析和功能要求》《系统分析与技术设计》____《数据库结构和数据字典》等。","options":["《产品简介》","《产品简介》","《功能函数文档》","《功能介绍》"],"answer":"C","explanation":"正确答案为C。"},
            {"id":69,"chapter":1,"type":"single","question":"项目承包方验收项目之前，应准备好相关的开发文档和产品文档，产品文档包括《产品 简介》《产品演示》《功能介绍》____等。","options":["《投标方案》","《需求分析和功能要求》","《系统分析与技术设计》","《评价报告》"],"answer":"D","explanation":"正确答案为D。"},
            {"id":70,"chapter":1,"type":"single","question":"____是软件开发结束后，相关的用户和/或独立测试人员根据验收测试计划对软件产品 投入实际应用以前进行的最后一次质量检验活动。","options":["验收测试","功能检测","质量鉴定","资料评审"],"answer":"A","explanation":"正确答案为A。"},
            {"id":71,"chapter":1,"type":"single","question":"项目资料是验收的重要依据，向客户提交的评审资料主要有产品相关说明、测试报告____ 等和客户相关的信息资料。","options":["用户手册","项目计划","概要设计说明书","需求说明书"],"answer":"A","explanation":"正确答案为A。"},
            {"id":72,"chapter":1,"type":"single","question":"____应是一个循序渐进的过程，要经历准备验收材料、提交申请 、初审、复审，直到 最后的验收合格，完成移交工作。","options":["软件测试","软件验收","功能检测","验收流程"],"answer":"B","explanation":"正确答案为B。"},
            {"id":73,"chapter":1,"type":"single","question":"项目验收完毕后，大家对项目进行回顾、反思、总结、分享项目中好的方法和好的实践， 分析项目中存在的问题、缺点和不足，讨论、提出改进方案等，然后把这些内容写一个报告， 提交给上一级部门，这个会称作____","options":["总结会议","评审会议","项目回顾会","改进会议"],"answer":"A","explanation":"正确答案为A。"},
            {"id":74,"chapter":1,"type":"single","question":"回归缺陷率和____一般用来评价开发和测试的工作质量。","options":["千行代码缺陷率","缺陷代码审查率","无用缺陷率","缺陷密度"],"answer":"C","explanation":"正确答案为C。"},
            {"id":75,"chapter":1,"type":"single","question":"文档生产率、测试用例生产率及代码生产率属于____。","options":["代码质量","规模度量指标","代码度量指标","生产率指标"],"answer":"D","explanation":"正确答案为D。"},
            {"id":76,"chapter":1,"type":"single","question":"____包括项目整体回顾、做得好的方面、做得坏的方面，改进方案和建议以及寻求帮助 信息。","options":["总结报告","方案建议","项目总结","项目评价"],"answer":"A","explanation":"正确答案为A。"},
            {"id":77,"chapter":1,"type":"single","question":"调查和研究历史项目的变更信息，请经验丰富的专家对项目可能出现的变更进行评估是 属于____策略采用的方法。","options":["变更经验总结","变更适应","变更执行","变更预防"],"answer":"D","explanation":"正确答案为D。"},
            {"id":78,"chapter":1,"type":"single","question":"区分优先级和重要性的原则，除了二八原则、四象限原则还有____。","options":["从客户角度考虑","从技术角度考虑","从关系人角度考虑","从管理角度考虑"],"answer":"A","explanation":"正确答案为A。"},
            {"id":79,"chapter":1,"type":"single","question":"数据分析中，寻找主要问题或影响质量的主要原因所使用的方法是____。","options":["关联图法","排列图法","KJ 法","PDP"],"answer":"B","explanation":"正确答案为B。"},
            {"id":80,"chapter":1,"type":"single","question":"如果想简单、清楚地展示项目整体进度（客户和有些利益相关人员只关心项目的整体进 展情况），可以选用____。","options":["延迟图","时间线","对比图","燃尽图"],"answer":"B","explanation":"正确答案为B。"},
            {"id":81,"chapter":1,"type":"single","question":"____不是单纯以时间最长的路径为关键路径，而是考虑了工作根据资源约束，调整工序， 确定关键链，最后确定关键路径。","options":["PERT","CPM","关键链技术","VERT"],"answer":"C","explanation":"正确答案为C。"},
            {"id":82,"chapter":1,"type":"single","question":"VERT 网络的建模要素是活动和节点，每个活动和节点都具有时间、费用和____3 种参 数。","options":["进度","成本","性能","技术"],"answer":"C","explanation":"正确答案为C。"},
            {"id":83,"chapter":1,"type":"single","question":"常用的风险分析技术 ____为了适应某些高度不确定性和风险性的决策问题开发的网络 仿真系统是。","options":["数学建模","风险评审技术","敏感性分析法","模拟仿真法"],"answer":"B","explanation":"正确答案为B。"},
            {"id":84,"chapter":1,"type":"single","question":"常用风险分析技术____通过主观判断出错的范围，出错的可能性，使用主观的成本/收 益思考过程做出的评价。","options":["情景分析","专家决策方法","损失期望值法","人工估计"],"answer":"A","explanation":"正确答案为A。"},
            {"id":85,"chapter":1,"type":"single","question":"____是一种非常重要、有效的风险识别工具，将可能出现的问题列出清单，对照检查潜 在的风险。","options":["风险库建立","WBS 方法","风险检查表","调查表"],"answer":"C","explanation":"正确答案为C。"},
            {"id":86,"chapter":1,"type":"single","question":"____是降低风险发生概率及风险发生时采取的减低影响的措施。","options":["风险处理措施","风险监督措施","风险缓解措施","风险执行措施"],"answer":"C","explanation":"正确答案为C。"},
            {"id":87,"chapter":1,"type":"single","question":"对风险影响力进行衡量的活动，衡量风险发生的概率和风险发生后对项目目标的影响程 度，为制定风险对策提供依据，指的是____。","options":["风险识别","风险评估","风险计划","风险应对"],"answer":"B","explanation":"正确答案为B。"},
            {"id":88,"chapter":1,"type":"single","question":"____可以用于整个软件开发周期或某个特定的开发阶段，也可以扩展到修正的、关闭的 缺陷，获取开发人员的工作效率等。","options":["阶段性缺陷清除","缺陷转移","缺陷预防","缺陷到达模式"],"answer":"D","explanation":"正确答案为D。"},
            {"id":89,"chapter":1,"type":"single","question":"____是由测试过程中发现的缺陷权重、产品发布之后发现的缺陷权重，以及新增加的和 修改的千行代码数共同决定。","options":["代码质量","产品质量","测试有效性","测试质量"],"answer":"A","explanation":"正确答案为A。"},
            {"id":90,"chapter":1,"type":"single","question":"____思想是将处理缺陷和失误造成的成本降到最低，提高工作质量和工作效率。","options":["缺陷预防","零缺陷管理","缺陷分析","破坏性测试"],"answer":"B","explanation":"正确答案为B。"},
            {"id":91,"chapter":1,"type":"single","question":"____用于需求文档评审，按照用户使用场景对产品/文档进行评审。","options":["检查表","互为复审","走查","场景分析"],"answer":"D","explanation":"正确答案为D。"},
            {"id":92,"chapter":1,"type":"single","question":"质量计划是针对具体的软件开发制定的，经历了____个阶段.","options":["3","4","5","6"],"answer":"B","explanation":"正确答案为B。"},
            {"id":93,"chapter":1,"type":"single","question":"____通过与其他同类项目的质量计划制定和实施过程的比较，为改进项目实施过程提供 思路和可参考的标准，是制定质量计划的主要方法之一。","options":["利益/成本分析","流程图","基准","试验设计"],"answer":"C","explanation":"正确答案为C。"},
            {"id":94,"chapter":1,"type":"single","question":"代码版本控制 、需求变更控制是属于软件质量保证计划内容的____。","options":["质量目标","质量的任务","配置管理要求","质量控制工具"],"answer":"C","explanation":"正确答案为C。"},
            {"id":95,"chapter":1,"type":"single","question":"____由一个独立部门审查其他各部门的工作，检查已有模板、规则和流程等的合规。","options":["内审","复审","审查","初审"],"answer":"A","explanation":"正确答案为A。"},
            {"id":96,"chapter":1,"type":"single","question":"____按照活动开始到活动结束的顺序对网络中的所有活动进行遍历。","options":["正向遍历","反向遍历","逆向遍历","顺序遍历"],"answer":"A","explanation":"正确答案为A。"},
            {"id":97,"chapter":1,"type":"single","question":"____按照活动结束到活动开始的倒序对网络中的所有活动进行遍历。","options":["正向遍历","反向遍历","逆向遍历","顺序遍历"],"answer":"B","explanation":"正确答案为B。"},
            {"id":98,"chapter":1,"type":"single","question":"压缩工期，是在保证质量的前提下，寻求任务、时间和____三者之间的最佳平衡。","options":["性能","费用","技术","成本"],"answer":"D","explanation":"正确答案为D。"},
            {"id":99,"chapter":1,"type":"single","question":"____的标识要在项目计划和进展的时候，将那些可能成为关键活动的非关键活动标注出 来的过程。","options":["关键活动","关键路径","准关键活动","非关键活动"],"answer":"C","explanation":"正确答案为C。"},
            {"id":100,"chapter":1,"type":"single","question":"____是指一个活动开始，另一个活动才能开始。","options":["FS","SS","FF","SF"],"answer":"B","explanation":"正确答案为B。"},
            {"id":101,"chapter":1,"type":"single","question":"WBS 成本估算中____是将项目任务分解到最小单位工作包，对项目工作包进行详细 的成本估算，然后通过各个成本汇总将结果累加起来，得出项目总成本。","options":["自上而下的估算","自下而上的估算","差别估计","代码行估算"],"answer":"B","explanation":"正确答案为B。"},
            {"id":102,"chapter":1,"type":"single","question":"当一切条件都顺利时该项工作所需时间指的是____。","options":["最可能时间","最乐观时间","最悲观时间","平均时间"],"answer":"B","explanation":"正确答案为B。"},
            {"id":103,"chapter":1,"type":"single","question":"项目进度表的制作需要计划项目每一个活动的开始时间和结束时间，也就是项目活动 的历时叫____。","options":["工时","人月","工期","人日"],"answer":"C","explanation":"正确答案为C。"},
            {"id":104,"chapter":1,"type":"single","question":"____是项目组内成员，他们的时间全部可以由项目经理来支配且不能过度分配。","options":["多项目资源","特殊技能资源","外部资源","完全可分配资源"],"answer":"D","explanation":"正确答案为D。"},
            {"id":105,"chapter":1,"type":"single","question":"进行所需人力资源估算是根据工作量和____。","options":["项目规模","技术难度","开发周期","管理能力"],"answer":"C","explanation":"正确答案为C。"},
            {"id":106,"chapter":1,"type":"single","question":"多因数估算模型中涉及到工作量估算公式包括了____种情况。","options":["3","4","5","6"],"answer":"A","explanation":"正确答案为A。"},
            {"id":107,"chapter":1,"type":"single","question":"工作量估算中的多变量模型涉及到的特殊技术因子，反映了软件开发的技术影响程度，， 它随着对软件各种技术需求的增长而____。","options":["降低","增长","不变","变化"],"answer":"B","explanation":"正确答案为B。"},
            {"id":108,"chapter":1,"type":"single","question":"项目估算的好坏取决于____。","options":["进度估算","资源估算","成本估算","项目规模估算"],"answer":"D","explanation":"正确答案为D。"},
            {"id":109,"chapter":1,"type":"single","question":"在分解技术中____是最常用的方法，不局限于软件产品的功能分解，也可以扩展到 非功能特性以及其他软件任务的分解上。","options":["功能点分析","WBS 方法","代码行估算","专家判断"],"answer":"B","explanation":"正确答案为B。"},
            {"id":110,"chapter":1,"type":"single","question":"创建WBS 可以用自上而下、自下而上、类比、归纳等方法，最常用的是____方法。","options":["自上而下","自下而上","类比","归纳"],"answer":"A","explanation":"正确答案为A。"},
            {"id":111,"chapter":1,"type":"single","question":"要完成客观、行之有效的软件项目计划，一定要清楚项目计划的输入，其中 ____可能 是客户、用户，也可能是投资方、关联方或合作方。","options":["项目可用的人力资源","项目干系人","项目市场人员","项目测试人员"],"answer":"B","explanation":"正确答案为B。"},
            {"id":112,"chapter":1,"type":"single","question":"项目的产品规范和____应高度一致，以保证项目最终能交付满足特定要求产品。","options":["项目范围","范围说明书","项目参考条款","工作范围"],"answer":"D","explanation":"正确答案为D。"},
            {"id":113,"chapter":1,"type":"single","question":"成本计划一般会分为成本估算____和费用控制。","options":["人员工资","管理费用","成本预算","费用预算"],"answer":"D","explanation":"正确答案为D。"},
            {"id":114,"chapter":1,"type":"single","question":"在冲刺结束后召开的关于自我持续改进的会议是____。","options":["计划会","评审会","回顾会","站立会"],"answer":"C","explanation":"正确答案为C。"},
            {"id":115,"chapter":1,"type":"single","question":"____是最早出现的软件开发模型，在软件工程中占有重要的地位，提供了软件开发的 基本框架。","options":["瀑布模型","快速原型","增量模型","敏捷模型"],"answer":"A","explanation":"正确答案为A。"},
            {"id":116,"chapter":1,"type":"single","question":"系统的非功能性需求分析包括性能需求____和安全需求分析等。","options":["功能点需求","环境需求","业务需求","进度需求"],"answer":"B","explanation":"正确答案为B。"},
            {"id":117,"chapter":1,"type":"single","question":"业务范围随组织战略目标的变化而变化是____。","options":["项目","项目集","项目组合","子项目"],"answer":"C","explanation":"正确答案为C。"},
            {"id":118,"chapter":1,"type":"single","question":"项目管理的目标是以最小的代价最大程度地满足软件用户的需求和期望，在保证质量 的前提下，寻求____","options":["任务、时间和成本","任务、时间和工作量","任务、进度和成本","工作量、时间 和成本"],"answer":"A","explanation":"正确答案为A。"},
            {"id":119,"chapter":1,"type":"single","question":"项目生命周期一般可分为项目准备和启动、项目计划、项目实施等____个基本阶段。","options":["3","4","5","6"],"answer":"C","explanation":"正确答案为C。"},
            {"id":120,"chapter":1,"type":"single","question":"PMBOK 第5 版包括____个知识领域（）个过程","options":["10，47","10，39","9，47","9，39"],"answer":"A","explanation":"正确答案为A。"},
            {"id":121,"chapter":1,"type":"judge","question":"软件项目的目标性指其结果只可能是一种期望的产品或服务","answer":"T","explanation":"正确。"},
            {"id":122,"chapter":1,"type":"judge","question":"根据PMBOK, 项目生命周期分为启动、计划、执行、控制和结束5 个阶段","answer":"T","explanation":"正确。"},
            {"id":123,"chapter":1,"type":"judge","question":"在项目准备和启动阶段，一般是先收集相关信息，再进行项目的工作量估算","answer":"F","explanation":"错误。应为：可行性\n分析。"},
            {"id":124,"chapter":1,"type":"judge","question":"软件项目是有形产品，在做软件项目建议书时应该着重分析其意义、必要性和发展前景","answer":"F","explanation":"错误。应为：无形。"},
            {"id":125,"chapter":1,"type":"judge","question":"项目建议书一旦得到批准，我们就可以进入可行性研究阶段了","answer":"T","explanation":"正确。"},
            {"id":126,"chapter":1,"type":"judge","question":"标书一般包括项目需求分析、可行性研究方案和相关的财务预算","answer":"T","explanation":"正确。"},
            {"id":127,"chapter":1,"type":"judge","question":"项目投标的第二个阶段是供应商对标书进行评估","answer":"F","explanation":"错误。应为：需求方（客户）。"},
            {"id":128,"chapter":1,"type":"judge","question":"软件项目计费常使用固定总价合同和费用偿还合同","answer":"F","explanation":"错误。应为：功能点计费合同。"},
            {"id":129,"chapter":1,"type":"judge","question":"软件项目的组织架构是以项目经理为核心领导，项目总监对项目立项，其下设有项目经\n理和各个项目组","answer":"T","explanation":"正确。"},
            {"id":130,"chapter":1,"type":"judge","question":"软件规模越大，复杂性越高，不确定性就越大","answer":"T","explanation":"正确。"},
            {"id":131,"chapter":1,"type":"judge","question":"一般通过两个参数“风险发生的概率”和“风险发生的后所带来的损失”来评估风险","answer":"T","explanation":"正确。"},
            {"id":132,"chapter":1,"type":"judge","question":"软件规模估算的直接方法有功能点方法","answer":"F","explanation":"错误。应为：代码行估算法。"},
            {"id":133,"chapter":1,"type":"judge","question":"专家判断法或经验法适合于快速拿出一个初步估算，而不适合进行详细的估算","answer":"T","explanation":"正确。"},
            {"id":134,"chapter":1,"type":"judge","question":"自底向上估算模式要求先估算出底层任务一级（如果没有任务，则为活动）的工作量，\n然后层层向上汇总到活动、阶段和项目级","answer":"T","explanation":"正确。"},
            {"id":135,"chapter":1,"type":"judge","question":"工作量估算的方法一般可以根据历史数据和软件规模估算的结果进行估算","answer":"T","explanation":"正确。"},
            {"id":136,"chapter":1,"type":"judge","question":"COCOMO 方法重点考虑影响软件工作量的因素主要有四种产品因素、硬件因素、技术\n因素和项目因素","answer":"F","explanation":"错误。应为：人员因素。"},
            {"id":137,"chapter":1,"type":"judge","question":"扑克牌估算方法吸收了专家估算法的部分实践","answer":"T","explanation":"正确。"},
            {"id":138,"chapter":1,"type":"judge","question":"最可能时间，根据以往的直接经验和间接经验，这项工作最有可能用多少时间完成","answer":"T","explanation":"正确。"},
            {"id":139,"chapter":1,"type":"judge","question":"软件的质量是软件开发各个阶段质量的综合反映，每个环节都可能带来产品的质量问题，\n因此软件的质量管理贯穿了整个软件开发周期","answer":"T","explanation":"正确。"},
            {"id":140,"chapter":1,"type":"judge","question":"软件质量以预防为主，以过程管理为重，把质量的保证工作重点放在过程管理上","answer":"T","explanation":"正确。"},
            {"id":141,"chapter":1,"type":"judge","question":"评审主要目的是解决问题","answer":"F","explanation":"错误。应为：发现。"},
            {"id":142,"chapter":1,"type":"judge","question":"软件评审的方法很多，最不正式的一种评审方法可能是轮查，设计、开发和测试人员在\n工作过程中会自发地使用这种方法","answer":"F","explanation":"错误。应为：临时评审。"},
            {"id":143,"chapter":1,"type":"judge","question":"对于最可能产生风险的工作成果，要采用会议审查这种最正式的评审方法","answer":"T","explanation":"正确。"},
            {"id":144,"chapter":1,"type":"judge","question":"在评审过程中涉及多个角色，评审组长、作者、读者、记录者、评审员、审核者和协调\n者","answer":"T","explanation":"正确。"},
            {"id":145,"chapter":1,"type":"judge","question":"在评审会议准备过程中，第一件事就是确定评审组长","answer":"T","explanation":"正确。"},
            {"id":146,"chapter":1,"type":"judge","question":"评审会议是评审活动的核心，所有与会者都需要仔细检查评审内容，提出可能的缺陷和\n问题，并记录在评审表格中","answer":"T","explanation":"正确。"},
            {"id":147,"chapter":1,"type":"judge","question":"评审结论可以是接受、有条件接受、不能接受和评审未完成","answer":"T","explanation":"正确。"},
            {"id":148,"chapter":1,"type":"judge","question":"采用分层次评审的方法，是先细节，后总体，按从高向低推进的方法来完成评审","answer":"F","explanation":"错误。应为：先\n总体，后细节。"},
            {"id":149,"chapter":1,"type":"judge","question":"需求往往由于来源不同，而属于不同的范畴，所以需求的评审也可以按照业务需求、功\n能需求、非功能需求、用户操作性需求等进行分类评审","answer":"T","explanation":"正确。"},
            {"id":150,"chapter":1,"type":"judge","question":"问题发现得越晚将越难管理，并且要花费越多的成本来修复问题","answer":"T","explanation":"正确。"},
            {"id":151,"chapter":1,"type":"judge","question":"风险管理是一个被广泛接受的最佳实践，包括在项目周期中尽早地识别和分析风险","answer":"T","explanation":"正确。"},
            {"id":152,"chapter":1,"type":"judge","question":"产品度量主要针对成熟度、管理、生命周期、生产率、缺陷植入率等进行度量","answer":"F","explanation":"错误。应为：过程度量。"},
            {"id":153,"chapter":1,"type":"judge","question":"代码质量的值越低，说明发现的缺陷越少或严重性越低，同时说明开发小组完成的代码\n质量越高","answer":"T","explanation":"正确。"},
            {"id":154,"chapter":1,"type":"judge","question":"测试有效性越高，越接近100%，说明在产品发布之前发现的缺陷越多或越重要，同时\n说明测试小组的工作效率越高","answer":"T","explanation":"正确。"},
            {"id":155,"chapter":1,"type":"judge","question":"假如有100 个功能点，而在开发过程中发现了20 个错误，提交后又发现了3 个错误，\n整体缺陷清除率为86.96%","answer":"T","explanation":"正确。"},
            {"id":156,"chapter":1,"type":"judge","question":"缺陷到达模式只是一个重要的过程状态或过程改进的度量","answer":"F","explanation":"错误。应为：不仅仅。"},
            {"id":157,"chapter":1,"type":"judge","question":"软件过程度量贯穿整个软件生命周期，包括需求度量、设计度量、编程和测试度量、维\n护度量等","answer":"T","explanation":"正确。"},
            {"id":158,"chapter":1,"type":"judge","question":"过程度量中制定度量参数时应尽可能考虑组织的受用性和一般性","answer":"F","explanation":"错误。应为：通用性。"},
            {"id":159,"chapter":1,"type":"judge","question":"在项目刚启动时，确定组织结构是可视化的首要任务","answer":"T","explanation":"正确。"},
            {"id":160,"chapter":1,"type":"judge","question":"延迟图是由甘特图演变而来的，它注重强调每个活动的相对进度情况","answer":"T","explanation":"正确。"},
            {"id":161,"chapter":1,"type":"judge","question":"燃尽图是在项目完成之前，对需要完成的工作的一种可视化表示","answer":"T","explanation":"正确。"},
            {"id":162,"chapter":1,"type":"short","question":"请解释：项目建议书","answer":"就是项目的立项申请报告，是如何向有关的投资方或上级阐述立项的必要\n性。","category":"名词解释"},
            {"id":163,"chapter":1,"type":"short","question":"请解释：评审合同","answer":"对合同内容进行最终的评定。","category":"名词解释"},
            {"id":164,"chapter":1,"type":"short","question":"请解释：项目估算","answer":"基于历史数据、经验和一定的方法和完成的，由项目的目标、工作范围、产\n品规模、业务逻辑和采用的技术等决定。","category":"名词解释"},
            {"id":165,"chapter":1,"type":"short","question":"请解释：构造性成本模型（COCOMO）","answer":"方法是一种精确、易于使用的基于模型的成本估算方法。","category":"名词解释"},
            {"id":166,"chapter":1,"type":"short","question":"请解释：用例","answer":"一个系统可以执行的动作序列的说明，其中这些动作与系统参与者进行交互。","category":"名词解释"},
            {"id":167,"chapter":1,"type":"short","question":"请解释：三点估算法","answer":"对每项工作的工期给出3 种预估值，最可能时间、最乐观时间和最悲观时\n间。","category":"名词解释"},
            {"id":168,"chapter":1,"type":"short","question":"请解释：质量管理","answer":"是指确定质量方针、目标和职责，并通过质量体系中的质量策划、质量控制、\n质量保证和质量改进来使其实现的所有管理职能的全部活动。","category":"名词解释"},
            {"id":169,"chapter":1,"type":"short","question":"请解释：过程缺陷密度","answer":"一种度量标准，可以用来判定过程产品的质量以及检验过程的执行程度。","category":"名词解释"},
            {"id":170,"chapter":1,"type":"short","question":"请解释：项目风险管理","answer":"是对项目风险从识别到分析直至采取应对措施等一系列过程，包括风险\n识别、风险量化、风险对策和风险监控等，从而将积极因素所产生的影响最大化并使消极因\n素产生的影响最小化，或者说达到消除风险、回避风险和缓解风险的目的。","category":"名词解释"},
            {"id":171,"chapter":1,"type":"short","question":"请解释：风险缓解措施","answer":"是指降低风险发生概率及风险发生时采取的减低影响的措施，处理风险\n的步骤包括提出风险处理意见、监督风险和在规定的阈值被超出时执行风险处理活动。","category":"名词解释"},
            {"id":172,"chapter":1,"type":"short","question":"请解释：检查表","answer":"非常重要和有效的风险识别工具，将可能出现的问题列出清单，可以对照检查\n潜在的风险。","category":"名词解释"},
            {"id":173,"chapter":1,"type":"short","question":"请解释：项目风险后果","answer":"是指项目风险发生后可能给项目带来的损失大小或对项目成功负面影响\n的程度。","category":"名词解释"},
            {"id":174,"chapter":1,"type":"short","question":"请解释：项目风险影响","answer":"是指项目风险可能影响到项目的哪些方面和工作。","category":"名词解释"},
            {"id":175,"chapter":1,"type":"short","question":"请解释：情景分析","answer":"一般通过主观判断什么地方可能会出错、出错的可能性有多大。给定这些宣\n的主观判断，使用主观的成本收益思考过程能做出接受、或缓解、或转移、或消除风险的评\n价。","category":"名词解释"},
            {"id":176,"chapter":1,"type":"short","question":"请解释：风险评审技术","answer":"是为了适应某些有高度不确定性和风险性的决策问题而开发一种网络仿\n真系统。","category":"名词解释"},
            {"id":177,"chapter":1,"type":"short","question":"请解释：软件过程度量","answer":"是收集、分析和解释数据，并对整个软件项目进行监督、控制和改进的\n过程。","category":"名词解释"},
            {"id":178,"chapter":1,"type":"short","question":"请说出项目组织结构的三种类型","answer":"职能型，公司的经营活动按照职能划分成部门，适合传统产品的生产项目。\n纯项目型，以项目经理为核心构造一个完整的项目组。类似一个子公司运作，拥有完整\n的人员配备。\n矩阵型，由职能型和纯项目型的结合体，项目内的成员受项目经理和职能经理双重领导。","category":"简答题"},
            {"id":179,"chapter":1,"type":"short","question":"滚动计划法的特点有哪些","answer":"分而治之，划分为多阶段制定计划；\n逐步求精，将预测计划逐步变成实施计划；\n动态规划，主动适应用户需求和软件开发环境的变化；\n和谐过渡，解决生产的连续性与计划的阶段性之间的矛盾，","category":"简答题"},
            {"id":180,"chapter":1,"type":"short","question":"制定WBS 愈发尖锐主要步骤有哪些","answer":"（1） 分解工作任务，将项目总体工作范围分解为合适的粒度。\n（2） 定义各项活动/任务之间的依赖关系。\n（3） 安排进度和资源。","category":"简答题"},
            {"id":181,"chapter":1,"type":"short","question":"项目计划的错误倾向有哪些","answer":"（1） 对计划不重视，原来计划就没做好，需求定义没做好。\n（2） 计划片面，没有收集到足够信息，就开始计划，容易形成片面的计划。\n（3） 计划没考虑风险。\n（4） 计划过于粗糙。","category":"简答题"},
            {"id":182,"chapter":1,"type":"short","question":"软件项目范围指的是什么","answer":"简单说是项目做什么，软件产品规范，即一个软件产品应该包括哪些功能特性，这就是\n产品需求文档所描述的。\n项目工作范围，即为了交付具有上述功能特性的产品所必须要做的工作，两者高度一致，\n以保证项目最终能够交付满足特定要求的产品。","category":"简答题"},
            {"id":183,"chapter":1,"type":"short","question":"项目成本的分类","answer":"（1） 人力资源成本\n（2） 资产类成本\n（3） 管理费用\n（4） 项目特别费用\n也可将软件项目成本分为直接成本，是项目本身的任务所引起的成本，间接成本是许多\n项目共享的成本。\n8 成本计划制定的步骤\n（1） 借助WBS 对成本估算结果进行初步调整，以增补遗漏成本，删除不必要的成本\n估算。\n（2） 依据项目所处的实际环境，对成本估算结果进行综合调整和汇总。\n（3） 当项目预算看上去已经合理可行，就将其写进项目计划提交审议，最后审议通过\n并确定成本基准计划。","category":"简答题"},
            {"id":184,"chapter":1,"type":"short","question":"编码阶段发生需求变化的情景为例来完成工作量的估算，请简述具体步骤","answer":"（1） 进行需求变更的波及范围分析。\n（2） 进行本次变更的WBS 分解。\n（3） 对于变更引起的代码变化进行规模、复杂度等其他属性的估计。\n（4） 根据本项目的编码生产率及估计的规模采用模型法估计工作量。\n（5） 对于WBS 分解中其他活动进行经验估计。\n（6） 汇总所有的工作量得到本次变更的工作量估计。","category":"简答题"},
            {"id":185,"chapter":1,"type":"short","question":"多数情况下，假定有足够的资源，应根据项目的工作量估算、工作范围或项目周期来估","answer":"算资源，资源估算一般的情形有哪些。\n（1） 根据工作范围WBS 的分解结果，而不是工作量来进行资源 估算，先分析多少\n人数是最合适或最有效的，然后确定所需资源。\n（2） 根据工作量和软件产品发布时间的限制，估算需要的人数。在市场压力较大的情\n况下，人们往往不得不采用这种方法。","category":"简答题"},
            {"id":186,"chapter":1,"type":"short","question":"在整个软件项目开发中，有几种类型的活动关系","answer":"（1） 结束-开始，这是一类最普遍也是最常用的活动类型。活动A 结束后，活动B 马上开\n始，或是活动A 结束后，活动B 有一段滞后时间才开始。\n（2） 开始-开始，是指一个活动开始，另一个活动才能开始。这种活动类型经常表示 某\n种并行而且具有一定依赖关系的活动。\n（3） 结束-结束，一个活动必须在另一个活动结束之前 结束。这种活动类型经常表示 某\n种并行，但其产出物具有一定依赖关系的活动。","category":"简答题"},
            {"id":187,"chapter":1,"type":"short","question":"简要说明前导图法和箭线图法","answer":"前导图法又叫单节点网络图法，它用单个节点（方框）表示一项活动，用节点为之\n间的生产线表示项目活动之间的相互依赖关系。\n箭线图法，又叫双代号网络图法，就是用箭线表示活动，活动之间用节点（称作“事\n件”）连接，只能表示结束-开始关系，每个活动必须用唯一的紧前事件和唯一的紧后事\n件描述。在箭线图表示法中，当正常的活动箭头已不能全面或正确描述逻辑关系时，需\n要使用虚拟活动。虚拟活动在图形中用虚线箭头表示。也可以理解为当活动要并行发生\n时，就需要使用虚拟活动。","category":"简答题"},
            {"id":188,"chapter":1,"type":"short","question":"请简述网络模型的遍历方式","answer":"（1） 正向遍历，项目网络的正向遍历就是按照活动开始到活动结束的顺序对网络中\n的每个活动进行遍历，通过执行正向遍历来计算出每个活动最早开始和最早结\n束时间。最早开始时间是指某项活动能够开始的最早时间。最早结束时间是指某\n一活动能够完成的最早时间。最早结束时间是活动的最早开始时间与活动工期\n的总和。\n（2） 反向遍历，项目网络的反向遍历和正向遍历相反，就是按照活动结束到活动开始\n的倒序对网络中的每个活动进行遍历。通过执行反向遍历来计算出每个活动最\n迟开始和最迟结束日期。最迟开始时间是指为了使整个项目在要求完工时间内\n完成，某项活动必须开始的最迟时间。最迟结束时间是指为了使整个项目在要求\n完工时间内完成，某项活动必须完成的最迟时间。最迟开始时间等于这项活动的\n最迟结束时间减去它的估计工期。","category":"简答题"},
            {"id":189,"chapter":1,"type":"short","question":"请简述里程碑的建立方法","answer":"（1） 设立合理的里程碑检查点。先根据项目选择合适的生命周期模型，再对项目进度\n估算。关键路径上一定要设立里程碑。\n（2） 制定里程碑的完成目标。\n（3） 明确里程碑的验证标准。里程碑的作用在软件开发过程中是确认项目的完成进\n度，需要给出清晰的验证标准，用来验证是否达到了里程碑。\n（4） 确认里程碑的利益相关人。\n（5） 标识里程碑的进度百分比。","category":"简答题"},
            {"id":190,"chapter":1,"type":"short","question":"请简述如何制定软件项目进度计划，最终形成进度表","answer":"（1） 在软件产品需求范围确定之前的初步进度时间表，也就是一个大概的初步计划\n的设定，并获得大家的认可和接受。\n（2） 在软件产品需求范围确定后的详细进度时间表，设定一个详细的实施计划，获得\n项目组的认可和接受。\n在项目开始的时候，需求的收集工作可能还在进行中，对项目后续的分析、设计、\n编码和测试等具体活动的标识还不能进行，进行初步进度计划的制定；直到需求范围被\n确定，正式进入需求分析的时候，完整的项目进度计划的制定才算正式开始。进度计划\n的编制和更新是一个由粗到细的求精过程。","category":"简答题"},
            {"id":191,"chapter":1,"type":"short","question":"进度计划的编制结果应该包括几个部分","answer":"（1） 项目具体活动及其相互依赖关系。\n（2） 每一具体活动的计划开始日期和期望完成日期—控制具体活动的完成时间是确\n保项目按时完成的基础。\n（3） 活动负责人—对每个具体的活动都定义了相关的责任人，由负责人来全权管理\n和掌控活动的进度。\n（4） 资源的安排—确定每个具体活动，每个执行阶段的相关资源信息。特别是资源限\n制的问题。\n（5） 备用的进度计划—以防万一，有备无患。\n（6） 进度风险估计—利用用风险估计和分析方法对项目进度风险做出估计和规避计\n划。","category":"简答题"},
            {"id":192,"chapter":1,"type":"short","question":"软件项目进度计划审查的步骤是什么","answer":"（1） 进度计划的单元模块评审。\n（2） 进度计划的完整评审。\n（3） 修改项目进度计划。\n（4） 批准项目进度计划。","category":"简答题"},
            {"id":193,"chapter":1,"type":"short","question":"软件项目进度控制中项目阶段工作汇报与计划的内容包括哪些","answer":"（1） 上一阶段计划执行情况的描述，包括计划进度与实际进度的比较结果。\n（2） 项目问题及其跟踪，包括已经解决的问题和遗留的问题。\n（3） 下一阶段的工作计划安排，包括所采取的纠正和预防措施。\n（4） 下一阶段主要风险的预计和规避措施。\n（5） 资源申请、需要协调的事情及其人员。\n（6） 其他需要处理的问题等。","category":"简答题"},
            {"id":194,"chapter":1,"type":"short","question":"请说明影响软件项目成本的因素","answer":"（1） 项目的质量对成本的影响，并非质量越高越好，超过合理水平时，属于质量过剩。\n质量总成本由故障成本和预防/鉴定成本组成的。\n（2） 项目管理水平对成本的影响，既要控制好项目，预算和计划的准确性高，减少更\n新计划的风险，也就减少了成本，又要控制好项目成员，一方面可以引导正确的\n项目方向，另一方面运用高水平的管理技巧提高团队成员的工作效率。\n（3） 人力资源对成本的影响。在一个软件项目中，能力高低的员工比例要适当，以满\n足项目本身要求为宗旨。","category":"简答题"},
            {"id":195,"chapter":1,"type":"short","question":"请简述MSF 定义的风险管理原则","answer":"（1）风险是不可避免的，应主动规避风险。\n（2）识别是项目管理中一项积极、有益和必要的活动。\n（3）有效管理风险，管理活动应贯穿于项目整个生命周期。\n（4）风险评估是一项持续的活动，不是一次性的，应在项目的不同阶段不断识别和评\n估风险。\n（5）培养开放的沟通环境，所有项目组成员应参与风险识别与分析。\n（6）不能简单地以风险的数量来评价项目的价值。\n（7）将学习活动融入风险管理，从经验中学习，学习可以大大降低不确定性。\n（8）项目组中任何成员都有义务进行风险管理。","category":"简答题"},
            {"id":196,"chapter":1,"type":"short","question":"Riskit 方法包括的内容有哪些","answer":"（1）提供风险的明确定义。\n（2）明确定义目标、限制和其他影响项目成功的因素。\n（3）采用图形化的工具Riskit 分析图对风险建模，定性地记录风险。\n（4）使用应用性损失的概念排列风险的损失。\n（5）不同相关者的观点被明确建模。","category":"简答题"},
            {"id":197,"chapter":1,"type":"short","question":"结合项目具体情况，识别出项目的风险，应该提出什么样的问题","answer":"（1）什么样的风险会导致软件项目的彻底失败\n（2）在需求分析过程中，哪些因素会影响需求定义的结果 ，进而影响质量\n（3）开发技术中，哪些因素可能会对交付时间产生严重影响\n（4）人员休假或离职将对项目进度有多大影响","category":"简答题"},
            {"id":198,"chapter":1,"type":"short","question":"风险估计的目的有哪些","answer":"（1）加深对项目自身和环境的理解\n（2）进一步寻找实现项目目标的可行方案\n（3）使项目所有的不确定和风险都经过充分、系统而又有条理的考虑\n（4）明确不确定性对项目其他各个方面的影响，估计和比较项目各种方案或行动路线\n的风险大小、从中选择出威胁最小、机会最多的方案或行动路线。","category":"简答题"},
            {"id":199,"chapter":1,"type":"short","question":"风险监控中常见的有效措施有哪些","answer":"（1）建立并及时更新项目风险列表及风险排序。\n（2）风险应对审计，保证风险应对计划的执行并评估风险应对计划执行效果\n（3）对突发的风险或接受的风险采取适当的应变措施。\n（4）建立报告机制，及时将项目中存在的问题反映到项目经理或项目管理层。\n（5）定期召集项目干系人召开项目会议，对风险状况进行评估，并通过各方面对项目\n实施的反应来发现新风险。\n（6）更新相关数据库，如风险识别检查表\n（7）引入第三方咨询，定期对项目进行质量检查，以防范大的风险。","category":"简答题"},
            {"id":200,"chapter":1,"type":"short","question":"构造网络模型的过程大体可分为哪些步骤","answer":"（1）确定决策的环境\n（2）按工作进程与风险分析的需要画出流程图，包括各个阶段的子流程。\n（3）绘制VERT 网络图\n（4）确定弧和节点的数据。","category":"简答题"},
            {"id":201,"chapter":1,"type":"short","question":"如何更好地识别风险","answer":"（1）建立一张随着项目过程不断被更新维护的风险清单。\n（2）项目的建议书、可行性研究报告、设计或其他文件都是在若干假设、前提和预测\n的基础上做出的，项目的前提和假设之中隐藏着风险，其中法律、法规和规章等因素都是项\n目活动主体无法控制的。项目范围说明书能揭示出项目的成本、进度目标是否定的太高；审\n查人力资源与沟通管理计划中的人员安排 计划，发现哪些人员对项目的顺利进展有重大影\n响；项目采购与合同管理计划中，有关采取何种计划形式的合同的说明也需要审查。\n（3）可与本项目类比的先例。以前做过的同本项目类似的项目及其经验教训对于识别\n本项目的风险非常有用。","category":"简答题"},
            {"id":202,"chapter":1,"type":"short","question":"合理目标的设定可以成为团队发展的驱动力，如何进行目标管理","answer":"（1） 考虑设置团队短期和长期目标。\n（2） 把目标通过合理的手段进行分解，制定详细计划，执行、评估和反馈，不断地把团\n队的目标标准化，清晰化，加快目标的实现过程。\n（3） 要为团队成员设定个人目标。\n（4） 有了目标体系，还要有合理的工作分工才能高效、高质量地完成任务。","category":"简答题"},
            {"id":203,"chapter":1,"type":"short","question":"要想激励有效，都要通过的3 个基本步骤是什么","answer":"（1） 分析激励。不管是个体还是团队，要产生好的效果，必须深入分析他们的需求和期\n望。\n（2） 创建激励环境。良好的环境可以帮助员工发挥最大的潜能，善于运用激励的领导者\n可以帮助员工超越过去，创造更大的成绩。\n（3） 实现激励。对于有成熟 的员工要实施奖励。","category":"简答题"},
            {"id":204,"chapter":1,"type":"short","question":"团队发展都会经过的典型阶段是什么","answer":"（1） 形成期\n（2） 震荡期\n（3） 规范期\n（4） 成熟期\n（5） 重组期","category":"简答题"},
            {"id":205,"chapter":1,"type":"short","question":"软件团队绩效考核方法讨论","answer":"（1） 定性指标，工作态度、工作氛围、工作经验、团队合作能力、应变能力和处理问题\n能力。\n（2） 定时指标，工作量、工作效率、工作质量和是否每个里程碑都能按时完成。","category":"简答题"},
            {"id":206,"chapter":1,"type":"short","question":"如何有效地管理项目干系人","answer":"项目经理和项目团队需要完成三步。\n（1） 识别干系人\n（2） 分析了解干系人\n（3） 管理干系人的期望。","category":"简答题"},
            {"id":207,"chapter":1,"type":"short","question":"项目总结的目的有哪些","answer":"（1）分享经验。\n（2）避免犯相同的错误。\n（3）提出合理性建议。\n（4）提升项目流程的改进。\n（5）激励项目团队成员。\n（6）最佳实践的积累。","category":"简答题"},
            {"id":208,"chapter":1,"type":"short","question":"根据项目管理的特点和项目失败的教训总结，项目计划需要得到足够的重视，应科学地、","answer":"客观地制定计划，必要遵守的原则有哪些。\n（1）目标性原则。计划必须以目标为导向，服务于目标。制定计划前，一定要清楚目标\n（2）预防性原则。风险控制是软件项目计划的核心工作，所有计划工作始终要考虑如何降\n低项目风险。质量管理计划虽然要规划一系列质量控制措施和质量反馈机制，但更重要的是\n要进行缺陷预防，从源头预防缺陷的产生，才能真正保证产品的质量，项目进度和成本。\n（3）客观性原则。收集各方面的信息进行沟通，了解事实和真相，制定切实可行的计划。\n（4）系统性原则。在制定计划时，要把握各个因素、产品各个组件、各个项目任务之间的\n关系，特别是确定它们之间的依赖关系，才能使计划具有系统性。\n（5）适应性原则。根据情况变化，对计划进行调整。","category":"论述题"},
            {"id":209,"chapter":1,"type":"short","question":"请描述软件项目计划的常见流程","answer":"常见流程分为10 步。\n（1） 确定项目目标，包括最终交付的内容和质量标准。\n（2） 确定项目的工作范围，包括软件产品功能特性。\n（3） 根据质量目标，可以制定质量计划。\n（4） 采用WBS 方法，分解工作，确定各项具体的任务。\n（5） 针对具体的工作任务，估算工作量以及确定所需的资源。\n（6） 在上述工作基础上，制定资源计划、进度计划和成本计划。\n（7） 在上述过程中，完成风险识别和分析，最终完成风险管理计划。\n（8） 在资源计划和进度计划基础上，还可以完成辅助计划，如采购计划等。\n（9） 在上述过程中，都需要和软件项目干系人沟通、评审，以达成一致意见。\n（10） 项目计划获得有关方面（管理层、产品发布委员会等）的批准。","category":"论述题"},
            {"id":210,"chapter":1,"type":"short","question":"在项目计划中，需要制定项目管理的策略。请表述项目管理策略的主要内容","answer":"（1）选用软件开发过程模型，采用敏捷模型还是IBM 统一过程模型。\n（2）选用成熟的技术还是新兴的技术，引进新的技术还是采用团队熟悉的技术。一般会采\n用团队熟悉且成熟的技术。\n（3）项目合同管理策略，如合同的重要条款，如果利用条款以及如何 避免带来严重的风\n险的条款等。\n（4）成本管理策略。直接成本费用、项目部间接费用、上级管理费用等进行分层测评，然\n后根据各任务的较低指标确定目标成本来确定成本预算。\n（5）项目的控制策略。加强控制，多设置控制点。\n（6）项目的例会策略。例会制度可以分为项目组内部例会和外部协调例会。\n（7）信息汇报及发布制度。定期报告所做工作，工作状态及对工作进行总结。\n（8）项目问题处理及上报制度。\n（9）对于项目控制策略。控制点越多，项目偏离目标的可能性越小，而且工作量也会越小，\n能降低风险和成本。","category":"论述题"},
            {"id":211,"chapter":1,"type":"short","question":"风险对策计划是为了降低项目风险的损害而分析风险、制定风险应对策略方案的过程","answer":"主要有哪些方面。\n（1）制定风险计划，要经过3 个阶段---风险识别、风险评估和风险对策计划。首先要制定\n风险计划，了解要了解风险的出处与具体风险，可以通过列举通常的软件项目风险因素以使\n风险识别更明晰。可以使用风险检查表。也可集中识别常见的各种风险。\n（2）风险识别后，对风险产生的可能性和危害进行评估。对风险可能 性评估有助于关注高\n可能性的风险。一旦风险发生，有助于关注危害性大的风险。风险的综合危害度可以看作是\n风险发生可能性和危害程度的乘积。\n（3）编制风险应对策略。一是采取预防措施以阻止风险的发生，是预防 风险，二是针对 风\n险发生，制定需要采取怎样的措施，将风险造成的损失降到最低，是缓解风险。风险应对策\n略应把预防风险放在首位，是减少风险最彻底的方法。","category":"论述题"},
            {"id":212,"chapter":1,"type":"short","question":"请以一个酒店管理系统为例论述如何标识项目活动","answer":"可以从两条主线来考虑。一是根据软件开发生命周期，这条主线是以软件开发周期为框\n架，在分解项目活动的时候，可以按照软件开发周期模型的各个阶段对项目进行阶段性的划\n分，再结合软件项目的需求详细地考虑每个阶段的活动。二是根据软件开发功能点，这条主\n线与软件开发周期模式相反。它是以软件项目的需求分析为主线，对软件需求进行分析和整\n理使其形成各个功能点模块。然后结合软件开发周期对各个功能点模块进行细分。\n一套综合管理酒店的计算机系统，包括前台业务、客房服务、餐饮娱乐和行政后勤等多\n个子系统。先以软件开发生命周期为主线来划分，项目可以分为需求分析、系统设计、编码\n实现、系统测试和部署交付5 个阶段。也可以根据软件开发功能点来划分项目活动，对软件\n需求说明书的内容进行分析和划分，列出软件系统 的各个模块，并对“登记接待”模块的系\n统程序界面设计活动进行标识，这个模块的界面的设计活动有3 个，而其他设计活动都分布\n在各个模块中了。用这条主线进行活动标识 的时候，一定要注意各个模块之间交叉部分的\n连接和统一设计的问题。编辑和查询界面的设计是很多模块都要用到的，所以在这丙个界面\n设计之前，各个模块需要统一规划。","category":"论述题"},
            {"id":213,"chapter":1,"type":"short","question":"结合软件开发生命周期敏捷模型Scrum，请论述其里程碑的主要内容","answer":"里程碑是项目中完成阶段性工作的标志，标志着上一个阶段结束，下一个阶段开始，将\n一个过程性的任务用一个结论性的标志来描述，明确任务的起止点。里程碑具有层次性、不\n同类型的项目，里程碑可能不同； 不同规模项目的里程碑数量不一样，可以合并或分解。\n里程碑是一个以目标为导向的关键检查点，它表明为了达到特定的目标需要完成的一系列任\n务或活动。迭代零完成、用户故事准备工作完成、用户故事优先调整结束、界面设计完成、\n架构设计通过、用户故事完成、用户故事验收完成、迭代完成、迭代质量评估报告、迭代版\n本发布以及回顾总结会议完成（达到5 点以上得满分。）","category":"论述题"},
            {"id":214,"chapter":1,"type":"short","question":"明确里程碑的验收标准，“作为一个用户，我可以用我的账户登录这个系统”请以这个用户","answer":"故事列示验收标准。\n(1) 发用户提供正确的账号和密码时，可以正常登录系统。\n(2) 当用户提供错误的账号和密码时，系统提示登录账号和密码不符信息。\n(3) 当用户不提供账号和密码时，系统应该提示要求输入用户信息。\n(4) 当用户提供账号和密码超过限定长度字符时，系统提示相应错误信息。\n(5) 当用户提供不支持特殊字符的账号和密码信息，系统提示相应错误信息。\n(6) 根据安全需求，当用户输入密码不符大于3 次，系统需要锁住账户一小时，并提示用户\n相应信息。","category":"论述题"},
            {"id":215,"chapter":1,"type":"short","question":"在编制项目进度计划的时候，如何运用适当的策略和经验编制合理和完善的进度时间表","answer":"（1） 重视与客户的沟通。要主动积极与客户沟通，使大家意见统一，并科学地分析和\n解决问题的安排进度，制定出符合现实、合理的项目进度计划。\n（2） 进度计划最好按需制定。要围绕实现一系列特性的目标展开，按需制定项目计\n划。\n（3） 项目组成员共同参与制定项目进度计划。让项目团队成员对自己职责范围内的\n事提出建议的时间和资源，再作讨论约定。主观上，团队成员会更加投入工作。\n客观上，因个人能力不同，外人对其工作量和时间很难做出衡量。\n（4） 任务分解与并行化。在划分项目任务时，应尽力挖掘可以并行开展的任务，从而\n缩短项目的开发周期。\n（5） 任务、人力资源、时间分配要与进度相协调。软件开发是项目团队的集体劳动。\n在安排项目进度时，要考虑任务、人力、时间三者之间的平衡。\n（6） 项目的工作安排一定要责任到人，帮助协调和组织。\n（7） 工作量分布要合理。根据每个项目的特点，依据实际工作量规划不同开发阶段的\n时间和强度。\n（8） 充分利用一些历史数据。注意平时的数据积累，提炼出日后可以借鉴的数据和模\n板。\n（9） 考虑相关风险，计划意外事故缓冲时间。要为干扰项目进度的事情设定缓冲时\n间。这些时间是在制定进度表时加入的，可以分散增加到项目各个活动尤其是关\n键活动、各个里程碑或者适当的检查点后，可以集中增加到项目的最后。\n（10） 制定和使用进度计划检查清单。","category":"论述题"},
            {"id":216,"chapter":1,"type":"short","question":"从进度计划与进度控制角度分析影响软件项目进度的因素","answer":"(1) 从进度计划本身分析，主要影响因素有进度计划制定不细致，计划制定时形式重于\n内容，没有经过项目所有干系人评审，造成计划本身有问题； 进度计划的约束条件\n和依赖环境考虑不全，对项目所涉及的资源、环境、工具和相关的依赖条件分析不\n够完善； 工作量评估不准确，在进度计划时，对技术难度或相关风险认知不全，导\n致评估的工作量不准确。\n(2) 从进度控制角度考虑，主要影响因素有进度信息收集问题，要起掌握及时的、准确\n的、完整的项目进度信息，不仅依靠项目经理的经验和素质，还要依靠团队成员的\n积极配合； 进度监控和管理问题，即使进度计划很完美，如果缺乏有效的监控和管\n理，进度还是不可控的； 计划变更调整不及时，进度计划会随着项目的进展而逐渐\n细化，调整和修正，使进度计划符合实际要求，适应项目的变化。","category":"论述题"},
            {"id":217,"chapter":1,"type":"short","question":"软件开发过程是知识传递或知识转换的过程，注重和维持在知识转换中的完整性，才能","answer":"保证知识通过各个阶段正确有效传递，请描述如何进行知识传递。\n在软件开发过程中，信息和知识是通过纵向和横向交错进行传递。\n（1） 纵向传递，软件产品和技术知识从需求分析阶段到设计阶段，从设计阶段到编程阶\n段、从开发阶段到维护阶段、从产品上一个版本到当前 版本的知识传递过程，是一\n个具有很强时间顺序性的接力过程。需求分析阶段到设计阶段，从业务领域的、自\n然语言描述的需求转换为计算机领域技术性的描述，将需求文档、产品设计规格说\n明书转换为分析模型、设计模型和数据模型等。在编码阶段，将分析模型、设计模\n型和数据模型的描述语言转化为编辑语言。最后，发布的软件产品，试图完整地复\n原用户的需求。知识在传递过程中，失真越早，在后继的过程中知识的失真会放大，\n所以开始要确保知识传递的完整性。\n（2） 横向传递，软件产品和技术知识在不同团队之间的传递过程，包括不同工种的团队\n（市场人员、产品设计人员、编程人员、测试人员和技术支持人员）之间、不同产\n品线的开发团队之间、不同知识领域之间、新老员工之间等的知识传递过程。\n（3） 知识传递的有效方法。保证知识传递的有效性、及时性、正确性和完整性是必要的，\n应建立一套知识传递的流程、方法来帮助实现这些目标。在组织过程管理中加强团\n队谇建设、员工教育和培训。需求文档、产品规格说明书、设计的技术文档、测试\n计划和用例等的评审、复审既是质量保证的一种措施，也是一种知识传递的方式。\n使用UML 来描述领域知识、设计模型和程序实现等，能使大家对同样的一个问题有\n同样的认识，减少知识传递的难度和成本。","category":"论述题"},
            {"id":218,"chapter":1,"type":"short","question":"如何实现有效沟通，主要原则是什么","answer":"（1）原则之一：学会倾听。善于倾听，才能等对方的意思表达清楚，才能进行有效的沟通，\n益于解决问题。善于倾听是有效沟通的前提。\n（2）原则之二：表达准确。除了口头表达，还要借助其他辅助表达方法，在软件项目开发\n中，辅助表达方法尤为重要。\n（3）原则之三：及时沟通。有疑问的时候应及时和沟通。\n（4）原则之四：双向沟通。双向沟通比单向沟通更有效，双向沟通可以了解到更多的信息，\n要及时给予 反馈。\n（5）原则之五：换位思考，尝试从他人与自身位置不同的人的身上来考虑问题。\n养成沟通的好习惯，使沟通更有效。态度积极、牢记目标、重要的先说、协同效应和不断\n学习。","category":"论述题"},
            {"id":219,"chapter":1,"type":"short","question":"要达到知识经验共享的双赢，企业和个人需要做出何种努力呢","answer":"（1） 从企业角度，首先要提倡和强调知识经验共享的重要性； 其次要确立正确而鼓舞人\n心的知识管理愿景和战略目标； 再次要建立指导监督团队，来提供足够的推动力。\n最后要激励知识共享的贡献者。\n（2） 从个人角度，要做到无私奉献，无偿分享； 要积极参与知识的分享和讨论，在讨论\n中不断学习、相互提高，真正实现从知识到能力的跨越。","category":"论述题"},
            {"id":220,"chapter":1,"type":"short","question":"如何做好绩效管理","answer":"（1） 绩效管理工作前期调查，是绩效管理的前提。在制定计划之前，要明确企业的经营\n发展战略、组织结构、工作流程、岗位设置、企业文化等方面的信息。\n（2） 绩效计划的确定。包括一是团队整体绩效计划，二是团队成员个人绩效计划，两方\n面都应针对发展目标如何 实现，如何执行绩效管理你太笨了同深入细致的规划，保\n证每个环节都有监控和负责的人，可以确保整个绩效管理过程是可以追踪和衡量的。\n需要确定绩效目标、绩效实施计划方案、绩效实施时间或者周期、绩效管理追踪与\n辅导方法和绩效衡量标准等。\n（3） 绩效辅导实施。在计划的实施过程中，管理层要通过有效的沟通不断地对团队及其\n成员实施绩效辅导，并在取得或偏离阶段性目标的过程给予适当的激励或纠正，使\n整个计划实施不偏离中心轨道。\n（4） 绩效考核评价。在实施后进行评价，管理层通过合理分析，把绩效目标和实际所做\n的工作进行对比，尽量客观 地为被评估者指出优点及有待改进的地方。\n（5） 绩效反馈和绩效目标的提升。通过反馈可以掌握更多的信息和状况，再通过有效的\n沟通和讨论使其流程和制度更加完善，从而提高个人和整体的绩效。","category":"论述题"}
        ];
        console.log('内嵌软件项目管理题库加载成功，共', this.data.questions.length, '道题');
    },

    loadUserProgress() {
        try {
            const key = 'quiz_progress_' + (this.currentSubjectId || 'default');
            let saved = localStorage.getItem(key);
            // 迁移旧进度：如果新key没有数据，尝试从旧key读取并迁移
            if (!saved && this.currentSubjectId === 'software_analysis') {
                const oldSaved = localStorage.getItem('quiz_progress');
                if (oldSaved) {
                    saved = oldSaved;
                    localStorage.setItem(key, oldSaved);
                    console.log('已迁移旧进度到新存储格式');
                }
            }
            if (saved) {
                const progress = JSON.parse(saved);
                this.user.answered = progress.answered || {};
                this.user.wrong = progress.wrong || {};
                this.user.favorites = new Set(progress.favorites || []);
                this.user.history = progress.history || [];
                this.state.examHistory = progress.examHistory || [];
            } else {
                this.user = { answered: {}, wrong: {}, favorites: new Set(), history: [] };
                this.state.examHistory = [];
            }
        } catch (e) {
            console.error('加载进度失败:', e);
        }
    },

    saveUserProgress() {
        const key = 'quiz_progress_' + (this.currentSubjectId || 'default');
        const progress = {
            answered: this.user.answered,
            wrong: this.user.wrong,
            favorites: Array.from(this.user.favorites),
            history: this.user.history,
            examHistory: this.state.examHistory,
        };
        localStorage.setItem(key, JSON.stringify(progress));
    },

    renderSubjectSwitcher() {
        const subject = this.data.subjects.find(s => s.id === this.currentSubjectId);
        // Desktop sidebar
        const sidebarHeader = document.querySelector('.sidebar');
        if (sidebarHeader && this.data.subjects.length > 1) {
            let switcher = document.getElementById('subjectSwitcher');
            if (!switcher) {
                switcher = document.createElement('div');
                switcher.id = 'subjectSwitcher';
                switcher.className = 'subject-switcher';
                sidebarHeader.insertBefore(switcher, sidebarHeader.firstChild);
            }
            switcher.innerHTML = `
                <div class="subject-current">
                    <span class="subject-icon">${subject?.icon || '📚'}</span>
                    <span class="subject-name">${subject?.name || '未选择'}</span>
                    <span class="subject-arrow">▼</span>
                </div>
                <div class="subject-dropdown" id="subjectDropdown">
                    ${this.data.subjects.map(s => `
                        <button class="subject-option ${s.id === this.currentSubjectId ? 'active' : ''}" onclick="App.switchSubject('${s.id}')">
                            <span class="subject-icon">${s.icon}</span>
                            <span>${s.name}</span>
                        </button>
                    `).join('')}
                </div>
            `;
            switcher.onclick = (e) => {
                e.stopPropagation();
                if (!e.target.closest('.subject-option')) {
                    document.getElementById('subjectDropdown')?.classList.toggle('show');
                }
            };
        }
        // Update header title
        const logoText = document.querySelector('.logo-text');
        if (logoText && subject) {
            logoText.textContent = subject.name;
        }
        // Mobile: update home title
        const homeTitle = document.querySelector('#page-home .welcome-section h1');
        if (homeTitle && subject) {
            homeTitle.textContent = subject.name;
        }
    },

    setupEventListeners() {
        document.querySelectorAll('.sidebar-item, .mobile-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.showPage(page);
            });
        });

        // 点击外部关闭科目下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.subject-switcher')) {
                const dropdown = document.getElementById('subjectDropdown');
                if (dropdown) dropdown.classList.remove('show');
            }
        });

        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetProgress();
        });

        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 300);
        });

        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
        });

        document.querySelectorAll('.config-btn[data-count]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.config-btn[data-count]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.state.examConfig.count = parseInt(e.currentTarget.dataset.count);
            });
        });
    },

    showPage(page) {
        if (page !== 'quiz' && page !== 'exam-quiz' && page !== 'chapter-quiz' && page !== 'wrong-quiz') {
            this.state.previousPage = this.state.currentPage;
        }
        this.state.currentPage = page;

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        let navPage = page;
        if (page === 'exam-quiz' || page === 'exam-result') navPage = 'exam';
        if (page === 'chapter-quiz' || page === 'chapter-result' || page === 'quiz') navPage = 'chapters';
        if (page === 'wrong-quiz' || page === 'wrong-result') navPage = 'wrong';

        document.querySelectorAll('.sidebar-item, .mobile-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === navPage);
        });

        switch (page) {
            case 'home': this.renderHome(); break;
            case 'chapters': this.renderChapters(); break;
            case 'wrong': this.renderWrongList(); break;
            case 'favorites': this.renderFavorites(); break;
            case 'stats': this.renderStats(); break;
            case 'exam': this.renderExamHistory(); break;
        }

        window.scrollTo(0, 0);
    },

    goBack() {
        if (this.state.currentPage === 'exam-quiz') {
            if (confirm('确定要退出考试吗？当前进度将不会保存。')) {
                this.stopExamTimer();
                this.showPage('exam');
            }
        } else if (this.state.currentPage === 'chapter-quiz') {
            if (confirm('确定要退出刷题吗？当前进度将不会保存。')) {
                this.showPage('chapters');
            }
        } else if (this.state.currentPage === 'wrong-quiz') {
            if (confirm('确定要退出错题重做吗？当前进度将不会保存。')) {
                this.showPage('wrong');
            }
        } else if (this.state.currentPage === 'quiz') {
            const quiz = this.state.currentQuiz;
            if (quiz && (quiz.type === 'sequential' || quiz.type === 'random' || quiz.type === 'favorites')) {
                if (confirm('确定要退出吗？当前进度将不会保存。')) {
                    this.showPage('home');
                }
            } else {
                this.showPage('chapters');
            }
        } else if (this.state.previousPage) {
            this.showPage(this.state.previousPage);
        } else {
            this.showPage('home');
        }
    },

    renderHome() {
        const total = this.data.questions.length;
        // 只统计当前科目存在的题目
        const validIds = new Set(this.data.questions.map(q => q.id));
        const practiced = Object.keys(this.user.answered).filter(id => validIds.has(Number(id) || id)).length;
        const correct = Object.values(this.user.answered).filter(a => a.correct).length;
        const wrong = Object.keys(this.user.wrong).filter(id => validIds.has(Number(id) || id)).length;
        const accuracy = practiced > 0 ? Math.round((correct / practiced) * 100) : 0;

        document.getElementById('homeTotal').textContent = total;
        document.getElementById('homePracticed').textContent = practiced;
        document.getElementById('homeAccuracy').textContent = accuracy + '%';
        document.getElementById('homeWrong').textContent = wrong;

        this.renderChapterProgress();
    },

    renderChapterProgress() {
        const container = document.getElementById('chapterProgress');
        if (!container) return;

        let html = '';
        this.data.chapters.forEach(chapter => {
            const questions = this.data.questions.filter(q => q.chapter === chapter.id);
            const practiced = questions.filter(q => this.user.answered[q.id]).length;
            const percent = questions.length > 0 ? Math.round((practiced / questions.length) * 100) : 0;

            html += `
                <div class="progress-item" onclick="App.startChapter(${chapter.id})">
                    <div class="progress-item-header">
                        <div class="progress-item-title">
                            <span>${chapter.icon}</span>
                            <span>${chapter.name}</span>
                        </div>
                        <span class="progress-item-stats">${practiced}/${questions.length}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    renderChapters() {
        const container = document.getElementById('chaptersList');
        if (!container) return;

        let html = '';
        this.data.chapters.forEach(chapter => {
            const questions = this.data.questions.filter(q => q.chapter === chapter.id);
            const practiced = questions.filter(q => this.user.answered[q.id]).length;
            const correct = questions.filter(q => this.user.answered[q.id]?.correct).length;
            const accuracy = practiced > 0 ? Math.round((correct / practiced) * 100) : 0;

            html += `
                <div class="chapter-card">
                    <div class="chapter-card-header">
                        <span class="chapter-icon">${chapter.icon}</span>
                        <span class="chapter-badge">${questions.length}题</span>
                    </div>
                    <div class="chapter-card-title">${chapter.name}</div>
                    <div class="chapter-card-stats">
                        <span>已做: ${practiced}</span>
                        <span>正确率: ${accuracy}%</span>
                    </div>
                    <div class="chapter-card-actions">
                        <button class="btn btn-outline btn-small" onclick="App.startChapter(${chapter.id}, 'study')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                            背题
                        </button>
                        <button class="btn btn-primary btn-small" onclick="App.startChapter(${chapter.id}, 'quiz')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            刷题
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    startChapter(chapterId, mode = 'study') {
        const questions = this.data.questions.filter(q => q.chapter === chapterId);
        const chapter = this.data.chapters.find(c => c.id === chapterId);

        if (questions.length === 0) {
            this.toast('该章节暂无题目', 'warning');
            return;
        }

        if (mode === 'study') {
            this.state.studyQuiz = {
                chapterId,
                title: chapter ? chapter.name : `第${chapterId}章`,
                questions: [...questions],
            };
            this.state.studyViewed = {};
            this.showPage('quiz');
            this.renderStudyMode();
        } else {
            this.state.chapterQuiz = {
                chapterId,
                title: chapter ? chapter.name : `第${chapterId}章`,
                questions: [...questions],
            };
            this.state.chapterAnswers = {};
            this.showPage('chapter-quiz');
            this.renderChapterQuiz();
        }
    },

    startSequential() {
        const questions = [...this.data.questions];
        if (questions.length === 0) {
            this.toast('题库为空', 'warning');
            return;
        }

        this.state.currentQuiz = { type: 'sequential', title: '顺序刷题', questions };
        this.state.currentQuestionIndex = 0;
        this.state.selectedAnswer = null;
        this.state.isAnswered = false;

        this.showPage('quiz');
        this.showSingleQuizMode();
        this.renderQuestion();
    },

    startRandom() {
        const questions = [...this.data.questions].sort(() => Math.random() - 0.5).slice(0, 50);
        if (questions.length === 0) {
            this.toast('题库为空', 'warning');
            return;
        }

        this.state.currentQuiz = { type: 'random', title: '随机练习', questions };
        this.state.currentQuestionIndex = 0;
        this.state.selectedAnswer = null;
        this.state.isAnswered = false;

        this.showPage('quiz');
        this.showSingleQuizMode();
        this.renderQuestion();
    },

    showSingleQuizMode() {
        const studyContainer = document.getElementById('studyModeContainer');
        const singleContainer = document.getElementById('singleQuizContainer');
        if (studyContainer) studyContainer.style.display = 'none';
        if (singleContainer) singleContainer.style.display = '';
    },

    showStudyModeContainer() {
        const studyContainer = document.getElementById('studyModeContainer');
        const singleContainer = document.getElementById('singleQuizContainer');
        if (studyContainer) studyContainer.style.display = '';
        if (singleContainer) singleContainer.style.display = 'none';
    },

    renderStudyMode() {
        const quiz = this.state.studyQuiz;
        if (!quiz) return;

        const container = document.getElementById('studyQuestionsList');
        if (!container) return;

        this.showStudyModeContainer();

        document.getElementById('studyTitle').textContent = quiz.title;

        const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };
        const letters = ['A', 'B', 'C', 'D'];

        let html = '';
        quiz.questions.forEach((question, index) => {
            const chapter = this.data.chapters.find(c => c.id === question.chapter);

            html += `
                <div class="exam-question-item" id="study-q-${question.id}" data-index="${index}">
                    <div class="exam-question-header">
                        <span class="exam-question-number">${index + 1}</span>
                        <span class="exam-question-type">${typeMap[question.type] || question.type}</span>
                        ${chapter ? `<span class="exam-question-chapter">${chapter.name}</span>` : ''}
                    </div>
                    <div class="exam-question-text">${question.question}</div>
                    <div class="exam-options-list">
            `;

            if (question.type === 'single') {
                question.options.forEach((opt, i) => {
                    const isCorrect = letters[i] === question.answer;
                    html += `
                        <div class="exam-option-item ${isCorrect ? 'selected correct' : ''}" data-question-id="${question.id}" data-index="${i}">
                            <span class="exam-option-letter">${letters[i]}</span>
                            <span class="exam-option-text">${opt}</span>
                            ${isCorrect ? '<span class="study-correct-icon">✓</span>' : ''}
                        </div>
                    `;
                });
            } else if (question.type === 'judge') {
                const isCorrectTrue = question.answer === '正确';
                html += `
                    <div class="exam-option-item ${isCorrectTrue ? 'selected correct' : ''}" data-question-id="${question.id}" data-index="0">
                        <span class="exam-option-letter">A</span>
                        <span class="exam-option-text">正确</span>
                        ${isCorrectTrue ? '<span class="study-correct-icon">✓</span>' : ''}
                    </div>
                    <div class="exam-option-item ${!isCorrectTrue ? 'selected correct' : ''}" data-question-id="${question.id}" data-index="1">
                        <span class="exam-option-letter">B</span>
                        <span class="exam-option-text">错误</span>
                        ${!isCorrectTrue ? '<span class="study-correct-icon">✓</span>' : ''}
                    </div>
                `;
            } else {
                html += `
                    </div>
                    <div class="study-answer-section">
                        <div class="study-answer-correct">
                            <span class="study-answer-label">参考答案：</span>
                            <span class="study-answer-value">${this.parseMarkdownImage(question.answer)}</span>
                        </div>
                        ${question.explanation ? `
                        <div class="study-answer-explanation">
                            <span class="study-answer-label">解析：</span>
                            <span class="study-answer-text">${question.explanation}</span>
                        </div>
                        ` : ''}
                    </div>
                `;
            }

            if (question.type !== 'short') {
                const correctAnswer = question.type === 'single' ? `${question.answer}. ${question.options[letters.indexOf(question.answer)]}` : this.parseMarkdownImage(question.answer);
                html += `
                    </div>
                    <div class="study-answer-section">
                        <div class="study-answer-correct">
                            <span class="study-answer-label">正确答案：</span>
                            <span class="study-answer-value">${correctAnswer}</span>
                        </div>
                        ${question.explanation ? `
                        <div class="study-answer-explanation">
                            <span class="study-answer-label">解析：</span>
                            <span class="study-answer-text">${question.explanation}</span>
                        </div>
                        ` : ''}
                    </div>
                `;
            }

            html += `
                </div>
            `;
        });

        container.innerHTML = html;
        this.renderStudyAnswerCard();
    },

    renderStudyAnswerCard() {
        const quiz = this.state.studyQuiz;
        if (!quiz) return;

        const container = document.getElementById('studyAnswerCardTypes');
        if (!container) return;

        const typeGroups = {};
        quiz.questions.forEach((q, index) => {
            if (!typeGroups[q.type]) typeGroups[q.type] = [];
            typeGroups[q.type].push({ ...q, index });
        });

        const typeNames = { single: '单选题', judge: '判断题', short: '简答题' };
        let html = '';

        Object.keys(typeGroups).forEach(type => {
            const questions = typeGroups[type];
            html += `
                <div class="answer-card-type-group">
                    <div class="answer-card-type-label">${typeNames[type]} (${questions.length}题)</div>
                    <div class="answer-card-grid">
            `;

            questions.forEach(q => {
                html += `
                    <button class="answer-card-btn" data-question-id="${q.id}" onclick="App.scrollToStudyQuestion(${q.id})">
                        ${q.index + 1}
                    </button>
                `;
            });

            html += `</div></div>`;
        });

        container.innerHTML = html;
        const totalEl = document.getElementById('studyTotalCount');
        if (totalEl) totalEl.textContent = quiz.questions.length;
    },

    scrollToStudyQuestion(questionId) {
        const questionEl = document.getElementById(`study-q-${questionId}`);
        if (questionEl) {
            questionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.querySelectorAll('#studyQuestionsList .exam-question-item').forEach(item => {
                item.classList.remove('current');
            });
            questionEl.classList.add('current');
        }
    },

    renderChapterQuiz() {
        const quiz = this.state.chapterQuiz;
        if (!quiz) return;

        const container = document.getElementById('chapterQuestionsList');
        if (!container) return;

        document.getElementById('chapterQuizTitle').textContent = quiz.title;

        const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };
        const letters = ['A', 'B', 'C', 'D'];

        let html = '';
        quiz.questions.forEach((question, index) => {
            const chapter = this.data.chapters.find(c => c.id === question.chapter);
            const isAnswered = this.state.chapterAnswers[question.id] !== undefined;

            html += `
                <div class="exam-question-item ${isAnswered ? 'answered' : ''}" id="chapter-q-${question.id}" data-index="${index}">
                    <div class="exam-question-header">
                        <span class="exam-question-number">${index + 1}</span>
                        <span class="exam-question-type">${typeMap[question.type] || question.type}</span>
                        ${chapter ? `<span class="exam-question-chapter">${chapter.name}</span>` : ''}
                    </div>
                    <div class="exam-question-text">${question.question}</div>
                    <div class="exam-options-list">
            `;

            if (question.type === 'single') {
                question.options.forEach((opt, i) => {
                    const isSelected = this.state.chapterAnswers[question.id] === i;
                    html += `
                        <div class="exam-option-item ${isSelected ? 'selected' : ''}" data-question-id="${question.id}" data-index="${i}" onclick="App.selectChapterOption(${question.id}, ${i})">
                            <span class="exam-option-letter">${letters[i]}</span>
                            <span class="exam-option-text">${opt}</span>
                        </div>
                    `;
                });
            } else if (question.type === 'judge') {
                const isSelectedTrue = this.state.chapterAnswers[question.id] === 0;
                const isSelectedFalse = this.state.chapterAnswers[question.id] === 1;
                html += `
                    <div class="exam-option-item ${isSelectedTrue ? 'selected' : ''}" data-question-id="${question.id}" data-index="0" onclick="App.selectChapterOption(${question.id}, 0)">
                        <span class="exam-option-letter">A</span>
                        <span class="exam-option-text">正确</span>
                    </div>
                    <div class="exam-option-item ${isSelectedFalse ? 'selected' : ''}" data-question-id="${question.id}" data-index="1" onclick="App.selectChapterOption(${question.id}, 1)">
                        <span class="exam-option-letter">B</span>
                        <span class="exam-option-text">错误</span>
                    </div>
                `;
            } else {
                const answer = this.state.chapterAnswers[question.id] || '';
                html += `
                    <textarea class="exam-short-answer" data-question-id="${question.id}" placeholder="请输入答案..." oninput="App.saveChapterShortAnswer(${question.id}, this.value)">${answer}</textarea>
                `;
            }

            html += `</div></div>`;
        });

        container.innerHTML = html;
        this.renderChapterAnswerCard();
    },

    selectChapterOption(questionId, optionIndex) {
        this.state.chapterAnswers[questionId] = optionIndex;
        const questionItem = document.querySelector(`#chapter-q-${questionId}`);
        if (questionItem) {
            const options = questionItem.querySelectorAll('.exam-option-item');
            options.forEach((opt, i) => {
                opt.classList.toggle('selected', i === optionIndex);
            });
            questionItem.classList.add('answered');
        }
        this.renderChapterAnswerCard();
    },

    saveChapterShortAnswer(questionId, value) {
        this.state.chapterAnswers[questionId] = value;
        const questionItem = document.querySelector(`#chapter-q-${questionId}`);
        if (questionItem) {
            if (value.trim()) {
                questionItem.classList.add('answered');
            } else {
                questionItem.classList.remove('answered');
            }
        }
        this.renderChapterAnswerCard();
    },

    renderChapterAnswerCard() {
        const quiz = this.state.chapterQuiz;
        if (!quiz) return;

        const container = document.getElementById('chapterAnswerCardTypes');
        if (!container) return;

        const typeGroups = {};
        quiz.questions.forEach((q, index) => {
            if (!typeGroups[q.type]) typeGroups[q.type] = [];
            typeGroups[q.type].push({ ...q, index });
        });

        const typeNames = { single: '单选题', judge: '判断题', short: '简答题' };
        let html = '';

        Object.keys(typeGroups).forEach(type => {
            const questions = typeGroups[type];
            html += `
                <div class="answer-card-type-group">
                    <div class="answer-card-type-label">${typeNames[type]} (${questions.length}题)</div>
                    <div class="answer-card-grid">
            `;

            questions.forEach(q => {
                const isAnswered = this.state.chapterAnswers[q.id] !== undefined;
                html += `
                    <button class="answer-card-btn ${isAnswered ? 'answered' : ''}" data-question-id="${q.id}" onclick="App.scrollToChapterQuestion(${q.id})">
                        ${q.index + 1}
                    </button>
                `;
            });

            html += `</div></div>`;
        });

        container.innerHTML = html;
        this.updateChapterStats();
    },

    updateChapterStats() {
        const quiz = this.state.chapterQuiz;
        if (!quiz) return;

        const total = quiz.questions.length;
        const answered = Object.keys(this.state.chapterAnswers).length;
        const unanswered = total - answered;

        const answeredEl = document.getElementById('chapterAnsweredCount');
        const unansweredEl = document.getElementById('chapterUnansweredCount');

        if (answeredEl) answeredEl.textContent = answered;
        if (unansweredEl) unansweredEl.textContent = unanswered;
    },

    scrollToChapterQuestion(questionId) {
        const questionEl = document.getElementById(`chapter-q-${questionId}`);
        if (questionEl) {
            questionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.querySelectorAll('#chapterQuestionsList .exam-question-item').forEach(item => {
                item.classList.remove('current');
            });
            questionEl.classList.add('current');
        }
    },

    submitChapterQuiz() {
        const quiz = this.state.chapterQuiz;
        if (!quiz) return;

        const total = quiz.questions.length;
        const answered = Object.keys(this.state.chapterAnswers).length;

        if (answered < total) {
            const unanswered = total - answered;
            if (!confirm(`还有 ${unanswered} 道题未作答，确定要提交吗？`)) {
                return;
            }
        }

        let correct = 0;
        const results = [];

        quiz.questions.forEach((question, index) => {
            const userAnswer = this.state.chapterAnswers[question.id];
            let isCorrect = false;
            let userAnswerText = '';
            let correctAnswerText = '';

            if (question.type === 'single') {
                const letters = ['A', 'B', 'C', 'D'];
                isCorrect = userAnswer !== undefined && letters[userAnswer] === question.answer;
                userAnswerText = userAnswer !== undefined ? `${letters[userAnswer]}. ${question.options[userAnswer]}` : '未作答';
                correctAnswerText = `${question.answer}. ${question.options[letters.indexOf(question.answer)]}`;
            } else if (question.type === 'judge') {
                const selectedText = userAnswer === 0 ? '正确' : (userAnswer === 1 ? '错误' : '');
                isCorrect = selectedText === question.answer;
                userAnswerText = selectedText || '未作答';
                correctAnswerText = question.answer;
            } else {
                isCorrect = true;
                userAnswerText = userAnswer || '未作答';
                correctAnswerText = this.parseMarkdownImage(question.answer);
            }

            if (isCorrect) {
                correct++;
            } else {
                if (!this.user.wrong[question.id]) {
                    this.user.wrong[question.id] = { count: 0, lastWrong: null, chapter: question.chapter };
                }
                this.user.wrong[question.id].count++;
                this.user.wrong[question.id].lastWrong = Date.now();
            }

            this.user.answered[question.id] = {
                correct: isCorrect,
                answer: userAnswer,
                timestamp: Date.now(),
            };

            results.push({ question, userAnswer, isCorrect, userAnswerText, correctAnswerText, index });
        });

        const accuracy = Math.round((correct / total) * 100);

        this.saveUserProgress();
        this.updateSidebarStats();

        this.showChapterResultPage({ total, correct, accuracy }, results);
    },

    showChapterResultPage(result, results) {
        this.showPage('chapter-result');

        const summaryEl = document.getElementById('chapterResultSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="exam-result-score ${result.accuracy >= 60 ? 'pass' : 'fail'}">
                    ${result.accuracy}%
                </div>
                <div class="exam-result-label">${result.accuracy >= 60 ? '恭喜通过！' : '继续努力！'}</div>
                <div class="exam-result-stats">
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value">${result.total}</div>
                        <div class="exam-result-stat-label">总题数</div>
                    </div>
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value" style="color: var(--success);">${result.correct}</div>
                        <div class="exam-result-stat-label">正确</div>
                    </div>
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value" style="color: var(--danger);">${result.total - result.correct}</div>
                        <div class="exam-result-stat-label">错误</div>
                    </div>
                </div>
            `;
        }

        const detailEl = document.getElementById('chapterResultDetail');
        if (detailEl) {
            let html = '';
            results.forEach(r => {
                const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };
                html += `
                    <div class="exam-result-item ${r.isCorrect ? 'correct' : 'wrong'}">
                        <div class="exam-result-item-header">
                            <span class="exam-question-number">${r.index + 1}</span>
                            <span class="exam-question-type">${typeMap[r.question.type]}</span>
                            <span class="exam-result-item-status ${r.isCorrect ? 'correct' : 'wrong'}">
                                ${r.isCorrect ? '✓ 正确' : '✗ 错误'}
                            </span>
                        </div>
                        <div class="exam-result-item-question">${r.question.question}</div>
                        <div class="exam-result-item-answers">
                            <div class="exam-result-item-answer">
                                <span class="exam-result-item-answer-label">你的答案：</span>
                                <span class="exam-result-item-answer-value ${r.isCorrect ? '' : 'user-wrong'}">${r.userAnswerText}</span>
                            </div>
                            ${!r.isCorrect ? `
                            <div class="exam-result-item-answer">
                                <span class="exam-result-item-answer-label">正确答案：</span>
                                <span class="exam-result-item-answer-value correct">${r.correctAnswerText}</span>
                            </div>
                            ` : ''}
                            ${r.question.explanation ? `
                            <div class="exam-result-item-answer">
                                <span class="exam-result-item-answer-label">解析：</span>
                                <span class="exam-result-item-answer-value">${r.question.explanation}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            detailEl.innerHTML = html;
        }
    },

    repracticeChapterWrong() {
        this.startWrongQuiz();
    },

    startExam() {
        const types = [];
        document.querySelectorAll('#page-exam .checkbox-label input:checked').forEach(cb => {
            types.push(cb.value);
        });

        if (types.length === 0) {
            this.toast('请至少选择一种题型', 'warning');
            return;
        }

        let questions = this.data.questions.filter(q => types.includes(q.type));
        questions = questions.sort(() => Math.random() - 0.5);

        if (this.state.examConfig.count > 0) {
            questions = questions.slice(0, this.state.examConfig.count);
        }

        if (questions.length === 0) {
            this.toast('没有符合条件的题目', 'warning');
            return;
        }

        this.state.examQuiz = {
            title: '模拟考试',
            questions,
            startTime: Date.now(),
        };
        this.state.examAnswers = {};
        this.state.examStartTime = Date.now();

        this.startExamTimer();

        this.showPage('exam-quiz');
        this.renderExamQuiz();
    },

    startExamTimer() {
        if (this.state.examTimerInterval) {
            clearInterval(this.state.examTimerInterval);
        }

        this.state.examTimerInterval = setInterval(() => {
            this.updateExamTimer();
        }, 1000);
    },

    updateExamTimer() {
        if (!this.state.examStartTime) return;

        const elapsed = Math.floor((Date.now() - this.state.examStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;

        const timerEl = document.getElementById('examTimer');
        if (timerEl) {
            timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    },

    stopExamTimer() {
        if (this.state.examTimerInterval) {
            clearInterval(this.state.examTimerInterval);
            this.state.examTimerInterval = null;
        }
    },

    renderExamQuiz() {
        const quiz = this.state.examQuiz;
        if (!quiz) return;

        const container = document.getElementById('examQuestionsList');
        if (!container) return;

        const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };
        const letters = ['A', 'B', 'C', 'D'];

        let html = '';
        quiz.questions.forEach((question, index) => {
            const chapter = this.data.chapters.find(c => c.id === question.chapter);
            const isAnswered = this.state.examAnswers[question.id] !== undefined;

            html += `
                <div class="exam-question-item ${isAnswered ? 'answered' : ''}" id="exam-q-${question.id}" data-index="${index}">
                    <div class="exam-question-header">
                        <span class="exam-question-number">${index + 1}</span>
                        <span class="exam-question-type">${typeMap[question.type] || question.type}</span>
                        ${chapter ? `<span class="exam-question-chapter">${chapter.name}</span>` : ''}
                    </div>
                    <div class="exam-question-text">${question.question}</div>
                    <div class="exam-options-list">
            `;

            if (question.type === 'single') {
                question.options.forEach((opt, i) => {
                    const isSelected = this.state.examAnswers[question.id] === i;
                    html += `
                        <div class="exam-option-item ${isSelected ? 'selected' : ''}" data-question-id="${question.id}" data-index="${i}" onclick="App.selectExamOption(${question.id}, ${i})">
                            <span class="exam-option-letter">${letters[i]}</span>
                            <span class="exam-option-text">${opt}</span>
                        </div>
                    `;
                });
            } else if (question.type === 'judge') {
                const isSelectedTrue = this.state.examAnswers[question.id] === 0;
                const isSelectedFalse = this.state.examAnswers[question.id] === 1;
                html += `
                    <div class="exam-option-item ${isSelectedTrue ? 'selected' : ''}" data-question-id="${question.id}" data-index="0" onclick="App.selectExamOption(${question.id}, 0)">
                        <span class="exam-option-letter">A</span>
                        <span class="exam-option-text">正确</span>
                    </div>
                    <div class="exam-option-item ${isSelectedFalse ? 'selected' : ''}" data-question-id="${question.id}" data-index="1" onclick="App.selectExamOption(${question.id}, 1)">
                        <span class="exam-option-letter">B</span>
                        <span class="exam-option-text">错误</span>
                    </div>
                `;
            } else {
                const answer = this.state.examAnswers[question.id] || '';
                html += `
                    <textarea class="exam-short-answer" data-question-id="${question.id}" placeholder="请输入答案..." oninput="App.saveExamShortAnswer(${question.id}, this.value)">${answer}</textarea>
                `;
            }

            html += `</div></div>`;
        });

        container.innerHTML = html;
        this.renderAnswerCard();
    },

    selectExamOption(questionId, optionIndex) {
        this.state.examAnswers[questionId] = optionIndex;
        const questionItem = document.querySelector(`#exam-q-${questionId}`);
        if (questionItem) {
            const options = questionItem.querySelectorAll('.exam-option-item');
            options.forEach((opt, i) => {
                opt.classList.toggle('selected', i === optionIndex);
            });
            questionItem.classList.add('answered');
        }
        this.renderAnswerCard();
    },

    saveExamShortAnswer(questionId, value) {
        this.state.examAnswers[questionId] = value;
        const questionItem = document.querySelector(`#exam-q-${questionId}`);
        if (questionItem) {
            if (value.trim()) {
                questionItem.classList.add('answered');
            } else {
                questionItem.classList.remove('answered');
            }
        }
        this.renderAnswerCard();
    },

    renderAnswerCard() {
        const quiz = this.state.examQuiz;
        if (!quiz) return;

        const container = document.getElementById('answerCardTypes');
        if (!container) return;

        const typeGroups = {};
        quiz.questions.forEach((q, index) => {
            if (!typeGroups[q.type]) typeGroups[q.type] = [];
            typeGroups[q.type].push({ ...q, index });
        });

        const typeNames = { single: '单选题', judge: '判断题', short: '简答题' };
        let html = '';

        Object.keys(typeGroups).forEach(type => {
            const questions = typeGroups[type];
            html += `
                <div class="answer-card-type-group">
                    <div class="answer-card-type-label">${typeNames[type]} (${questions.length}题)</div>
                    <div class="answer-card-grid">
            `;

            questions.forEach(q => {
                const isAnswered = this.state.examAnswers[q.id] !== undefined;
                html += `
                    <button class="answer-card-btn ${isAnswered ? 'answered' : ''}" data-question-id="${q.id}" onclick="App.scrollToExamQuestion(${q.id})">
                        ${q.index + 1}
                    </button>
                `;
            });

            html += `</div></div>`;
        });

        container.innerHTML = html;
        this.updateExamStats();
    },

    updateExamStats() {
        const quiz = this.state.examQuiz;
        if (!quiz) return;

        const total = quiz.questions.length;
        const answered = Object.keys(this.state.examAnswers).length;
        const unanswered = total - answered;

        const answeredEl = document.getElementById('answeredCount');
        const unansweredEl = document.getElementById('unansweredCount');

        if (answeredEl) answeredEl.textContent = answered;
        if (unansweredEl) unansweredEl.textContent = unanswered;
    },

    scrollToExamQuestion(questionId) {
        const questionEl = document.getElementById(`exam-q-${questionId}`);
        if (questionEl) {
            questionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.querySelectorAll('.exam-question-item').forEach(item => {
                item.classList.remove('current');
            });
            questionEl.classList.add('current');
        }
    },

    submitExam() {
        const quiz = this.state.examQuiz;
        if (!quiz) return;

        const total = quiz.questions.length;
        const answered = Object.keys(this.state.examAnswers).length;

        if (answered < total) {
            const unanswered = total - answered;
            if (!confirm(`还有 ${unanswered} 道题未作答，确定要提交吗？`)) {
                return;
            }
        }

        this.stopExamTimer();

        let correct = 0;
        const results = [];

        quiz.questions.forEach((question, index) => {
            const userAnswer = this.state.examAnswers[question.id];
            let isCorrect = false;
            let userAnswerText = '';
            let correctAnswerText = '';

            if (question.type === 'single') {
                const letters = ['A', 'B', 'C', 'D'];
                isCorrect = userAnswer !== undefined && letters[userAnswer] === question.answer;
                userAnswerText = userAnswer !== undefined ? `${letters[userAnswer]}. ${question.options[userAnswer]}` : '未作答';
                correctAnswerText = `${question.answer}. ${question.options[letters.indexOf(question.answer)]}`;
            } else if (question.type === 'judge') {
                const selectedText = userAnswer === 0 ? '正确' : (userAnswer === 1 ? '错误' : '');
                isCorrect = selectedText === question.answer;
                userAnswerText = selectedText || '未作答';
                correctAnswerText = question.answer;
            } else {
                isCorrect = true;
                userAnswerText = userAnswer || '未作答';
                correctAnswerText = this.parseMarkdownImage(question.answer);
            }

            if (isCorrect) {
                correct++;
            } else {
                if (!this.user.wrong[question.id]) {
                    this.user.wrong[question.id] = { count: 0, lastWrong: null, chapter: question.chapter };
                }
                this.user.wrong[question.id].count++;
                this.user.wrong[question.id].lastWrong = Date.now();
            }

            this.user.answered[question.id] = {
                correct: isCorrect,
                answer: userAnswer,
                timestamp: Date.now(),
            };

            results.push({ question, userAnswer, isCorrect, userAnswerText, correctAnswerText, index });
        });

        const accuracy = Math.round((correct / total) * 100);
        const timeUsed = Math.floor((Date.now() - this.state.examStartTime) / 1000);
        const minutes = Math.floor(timeUsed / 60);
        const seconds = timeUsed % 60;

        const examResult = {
            date: new Date().toLocaleString('zh-CN'),
            total,
            correct,
            accuracy,
            time: `${minutes}分${seconds}秒`,
        };
        this.state.examHistory.unshift(examResult);
        if (this.state.examHistory.length > 20) {
            this.state.examHistory = this.state.examHistory.slice(0, 20);
        }

        this.saveUserProgress();
        this.updateSidebarStats();

        this.showExamResultPage(examResult, results);
    },

    showExamResultPage(result, results) {
        this.showPage('exam-result');

        const summaryEl = document.getElementById('examResultSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="exam-result-score ${result.accuracy >= 60 ? 'pass' : 'fail'}">
                    ${result.accuracy}%
                </div>
                <div class="exam-result-label">${result.accuracy >= 60 ? '恭喜通过！' : '继续努力！'}</div>
                <div class="exam-result-stats">
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value">${result.total}</div>
                        <div class="exam-result-stat-label">总题数</div>
                    </div>
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value" style="color: var(--success);">${result.correct}</div>
                        <div class="exam-result-stat-label">正确</div>
                    </div>
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value" style="color: var(--danger);">${result.total - result.correct}</div>
                        <div class="exam-result-stat-label">错误</div>
                    </div>
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value">${result.time}</div>
                        <div class="exam-result-stat-label">用时</div>
                    </div>
                </div>
            `;
        }

        const detailEl = document.getElementById('examResultDetail');
        if (detailEl) {
            let html = '';
            results.forEach(r => {
                const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };
                html += `
                    <div class="exam-result-item ${r.isCorrect ? 'correct' : 'wrong'}">
                        <div class="exam-result-item-header">
                            <span class="exam-question-number">${r.index + 1}</span>
                            <span class="exam-question-type">${typeMap[r.question.type]}</span>
                            <span class="exam-result-item-status ${r.isCorrect ? 'correct' : 'wrong'}">
                                ${r.isCorrect ? '✓ 正确' : '✗ 错误'}
                            </span>
                        </div>
                        <div class="exam-result-item-question">${r.question.question}</div>
                        <div class="exam-result-item-answers">
                            <div class="exam-result-item-answer">
                                <span class="exam-result-item-answer-label">你的答案：</span>
                                <span class="exam-result-item-answer-value ${r.isCorrect ? '' : 'user-wrong'}">${r.userAnswerText}</span>
                            </div>
                            ${!r.isCorrect ? `
                            <div class="exam-result-item-answer">
                                <span class="exam-result-item-answer-label">正确答案：</span>
                                <span class="exam-result-item-answer-value correct">${r.correctAnswerText}</span>
                            </div>
                            ` : ''}
                            ${r.question.explanation ? `
                            <div class="exam-result-item-answer">
                                <span class="exam-result-item-answer-label">解析：</span>
                                <span class="exam-result-item-answer-value">${r.question.explanation}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            detailEl.innerHTML = html;
        }
    },

    renderQuestion() {
        const quiz = this.state.currentQuiz;
        if (!quiz || !quiz.questions[this.state.currentQuestionIndex]) return;

        const question = quiz.questions[this.state.currentQuestionIndex];
        const total = quiz.questions.length;
        const current = this.state.currentQuestionIndex + 1;

        document.getElementById('quizTitle').textContent = quiz.title;
        document.getElementById('currentNum').textContent = current;
        document.getElementById('totalNum').textContent = total;

        const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };
        const chapter = this.data.chapters.find(c => c.id === question.chapter);
        document.getElementById('questionType').textContent = typeMap[question.type] || question.type;
        document.getElementById('questionChapter').textContent = chapter ? chapter.name : '';

        document.getElementById('questionText').textContent = question.question;

        const optionsList = document.getElementById('optionsList');
        const answerSection = document.getElementById('answerSection');
        answerSection.style.display = 'none';

        if (question.type === 'single') {
            const letters = ['A', 'B', 'C', 'D'];
            optionsList.innerHTML = question.options.map((opt, i) => `
                <div class="option-item" data-index="${i}" onclick="App.selectOption(${i})">
                    <span class="option-letter">${letters[i]}</span>
                    <span class="option-text">${opt}</span>
                </div>
            `).join('');
            document.getElementById('btnSubmit').style.display = '';
        } else if (question.type === 'judge') {
            optionsList.innerHTML = `
                <div class="option-item" data-index="0" onclick="App.selectOption(0)">
                    <span class="option-letter">A</span>
                    <span class="option-text">正确</span>
                </div>
                <div class="option-item" data-index="1" onclick="App.selectOption(1)">
                    <span class="option-letter">B</span>
                    <span class="option-text">错误</span>
                </div>
            `;
            document.getElementById('btnSubmit').style.display = '';
        } else {
            optionsList.innerHTML = `
                <div style="padding: 16px; background: var(--primary-50); border-radius: 8px; color: var(--text-secondary);">
                    <p>这是一道简答题，点击"查看答案"显示参考答案。</p>
                </div>
            `;
            document.getElementById('btnSubmit').style.display = 'none';
        }

        this.state.selectedAnswer = null;
        this.state.isAnswered = false;
        document.getElementById('btnPrev').disabled = this.state.currentQuestionIndex === 0;
        document.getElementById('btnNext').disabled = true;

        const btnFavorite = document.getElementById('btnFavorite');
        if (btnFavorite) {
            btnFavorite.classList.toggle('active', this.user.favorites.has(question.id));
            btnFavorite.textContent = this.user.favorites.has(question.id) ? '★ 已收藏' : '☆ 收藏';
        }

        if (this.user.answered[question.id]) {
            this.showPreviousAnswer(question);
        }
    },

    selectOption(index) {
        if (this.state.isAnswered) return;

        this.state.selectedAnswer = index;

        document.querySelectorAll('.option-item').forEach((item, i) => {
            item.classList.toggle('selected', i === index);
        });
    },

    submitAnswer() {
        if (this.state.selectedAnswer === null) {
            this.toast('请先选择答案', 'warning');
            return;
        }

        const question = this.state.currentQuiz.questions[this.state.currentQuestionIndex];
        let isCorrect = false;

        if (question.type === 'single') {
            const letters = ['A', 'B', 'C', 'D'];
            isCorrect = letters[this.state.selectedAnswer] === question.answer;
        } else if (question.type === 'judge') {
            const selectedText = this.state.selectedAnswer === 0 ? '正确' : '错误';
            isCorrect = selectedText === question.answer;
        }

        this.user.answered[question.id] = {
            correct: isCorrect,
            answer: this.state.selectedAnswer,
            timestamp: Date.now(),
        };

        if (!isCorrect) {
            if (!this.user.wrong[question.id]) {
                this.user.wrong[question.id] = { count: 0, lastWrong: null, chapter: question.chapter };
            }
            this.user.wrong[question.id].count++;
            this.user.wrong[question.id].lastWrong = Date.now();
        }

        this.saveUserProgress();
        this.state.isAnswered = true;

        this.showAnswerResult(question, isCorrect);
    },

    showAnswerResult(question, isCorrect) {
        const options = document.querySelectorAll('.option-item');

        if (question.type === 'single') {
            const letters = ['A', 'B', 'C', 'D'];
            const correctIndex = letters.indexOf(question.answer);

            options.forEach((opt, i) => {
                if (i === correctIndex) {
                    opt.classList.add('correct');
                } else if (i === this.state.selectedAnswer && !isCorrect) {
                    opt.classList.add('wrong');
                }
            });
        } else if (question.type === 'judge') {
            const correctIndex = question.answer === '正确' ? 0 : 1;

            options.forEach((opt, i) => {
                if (i === correctIndex) {
                    opt.classList.add('correct');
                } else if (i === this.state.selectedAnswer && !isCorrect) {
                    opt.classList.add('wrong');
                }
            });
        }

        const answerSection = document.getElementById('answerSection');
        const answerResult = document.getElementById('answerResult');
        const answerExplanation = document.getElementById('answerExplanation');

        answerSection.style.display = 'block';
        answerResult.className = `answer-result ${isCorrect ? 'correct' : 'wrong'}`;
        answerResult.textContent = isCorrect ? '✓ 回答正确！' : '✗ 回答错误';
        answerExplanation.textContent = question.explanation || '';

        document.getElementById('btnSubmit').style.display = 'none';
        document.getElementById('btnNext').disabled = false;
    },

    showPreviousAnswer(question) {
        const record = this.user.answered[question.id];
        const options = document.querySelectorAll('.option-item');

        if (question.type === 'single') {
            const letters = ['A', 'B', 'C', 'D'];
            const correctIndex = letters.indexOf(question.answer);

            options.forEach((opt, i) => {
                if (i === correctIndex) {
                    opt.classList.add('correct');
                } else if (i === record.answer && !record.correct) {
                    opt.classList.add('wrong');
                }
            });
        } else if (question.type === 'judge') {
            const correctIndex = question.answer === '正确' ? 0 : 1;

            options.forEach((opt, i) => {
                if (i === correctIndex) {
                    opt.classList.add('correct');
                } else if (i === record.answer && !record.correct) {
                    opt.classList.add('wrong');
                }
            });
        }

        if (question.explanation) {
            const answerSection = document.getElementById('answerSection');
            const answerResult = document.getElementById('answerResult');
            const answerExplanation = document.getElementById('answerExplanation');

            answerSection.style.display = 'block';
            answerResult.className = `answer-result ${record.correct ? 'correct' : 'wrong'}`;
            answerResult.textContent = record.correct ? '✓ 回答正确' : '✗ 回答错误';
            answerExplanation.textContent = question.explanation;
        }

        this.state.isAnswered = true;
        document.getElementById('btnSubmit').style.display = 'none';
        document.getElementById('btnNext').disabled = false;
    },

    showAnswer() {
        const question = this.state.currentQuiz?.questions[this.state.currentQuestionIndex];
        if (!question) return;

        const answerSection = document.getElementById('answerSection');
        const answerResult = document.getElementById('answerResult');
        const answerExplanation = document.getElementById('answerExplanation');

        answerSection.style.display = 'block';
        answerResult.className = 'answer-result correct';
        answerResult.textContent = '参考答案';
        answerExplanation.textContent = question.answer + (question.explanation ? '\n\n' + question.explanation : '');

        this.user.answered[question.id] = {
            correct: true,
            answer: 'viewed',
            timestamp: Date.now(),
        };
        this.saveUserProgress();

        document.getElementById('btnNext').disabled = false;
        this.state.isAnswered = true;
    },

    prevQuestion() {
        if (this.state.currentQuestionIndex > 0) {
            this.state.currentQuestionIndex--;
            this.renderQuestion();
        }
    },

    nextQuestion() {
        const quiz = this.state.currentQuiz;
        if (!quiz) return;

        if (this.state.currentQuestionIndex < quiz.questions.length - 1) {
            this.state.currentQuestionIndex++;
            this.renderQuestion();
        } else {
            this.finishQuiz();
        }
    },

    finishQuiz() {
        const quiz = this.state.currentQuiz;
        if (!quiz) return;

        const total = quiz.questions.length;
        const correct = quiz.questions.filter(q => this.user.answered[q.id]?.correct).length;
        const accuracy = Math.round((correct / total) * 100);

        if (quiz.type === 'exam') {
            const timeUsed = Math.round((Date.now() - quiz.startTime) / 1000);
            const minutes = Math.floor(timeUsed / 60);
            const seconds = timeUsed % 60;

            const examResult = {
                date: new Date().toLocaleString('zh-CN'),
                total,
                correct,
                accuracy,
                time: `${minutes}分${seconds}秒`,
            };
            this.state.examHistory.unshift(examResult);
            if (this.state.examHistory.length > 20) {
                this.state.examHistory = this.state.examHistory.slice(0, 20);
            }

            this.showExamResult(examResult);
        } else {
            this.toast(`练习完成！正确率：${accuracy}%`, accuracy >= 60 ? 'success' : 'warning');
            this.showPage(quiz.type === 'chapter' ? 'chapters' : 'home');
        }

        this.saveUserProgress();
        this.updateSidebarStats();
    },

    showExamResult(result) {
        this.showPage('exam-result');

        const summaryEl = document.getElementById('examResultSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="exam-result-score ${result.accuracy >= 60 ? 'pass' : 'fail'}">
                    ${result.accuracy}%
                </div>
                <div class="exam-result-label">${result.accuracy >= 60 ? '恭喜通过！' : '继续努力！'}</div>
                <div class="exam-result-stats">
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value">${result.total}</div>
                        <div class="exam-result-stat-label">总题数</div>
                    </div>
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value" style="color: var(--success);">${result.correct}</div>
                        <div class="exam-result-stat-label">正确</div>
                    </div>
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value" style="color: var(--danger);">${result.total - result.correct}</div>
                        <div class="exam-result-stat-label">错误</div>
                    </div>
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value">${result.time}</div>
                        <div class="exam-result-stat-label">用时</div>
                    </div>
                </div>
            `;
        }
    },

    renderWrongList() {
        const container = document.getElementById('wrongList');
        if (!container) return;

        const wrongIds = Object.keys(this.user.wrong);
        if (wrongIds.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无错题，继续努力！</div>';
            return;
        }

        const sortBy = document.getElementById('wrongSortBy')?.value || 'count';
        let wrongQuestions = wrongIds.map(id => ({
            id: parseInt(id),
            ...this.user.wrong[id]
        }));

        if (sortBy === 'count') {
            wrongQuestions.sort((a, b) => b.count - a.count);
        } else if (sortBy === 'recent') {
            wrongQuestions.sort((a, b) => b.lastWrong - a.lastWrong);
        } else if (sortBy === 'chapter') {
            wrongQuestions.sort((a, b) => a.chapter - b.chapter);
        }

        let html = '';
        wrongQuestions.forEach(wrong => {
            const question = this.data.questions.find(q => q.id === wrong.id);
            if (!question) return;

            const chapter = this.data.chapters.find(c => c.id === question.chapter);
            const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };

            html += `
                <div class="wrong-item">
                    <div class="wrong-item-header">
                        <span class="wrong-item-type">${typeMap[question.type]}</span>
                        ${chapter ? `<span class="wrong-item-chapter">${chapter.name}</span>` : ''}
                        <span class="wrong-item-count">错误${wrong.count}次</span>
                    </div>
                    <div class="wrong-item-question">${question.question}</div>
                    <div class="wrong-item-actions">
                        <button class="btn btn-small btn-outline" onclick="App.startWrongQuiz(${wrong.id})">重做</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    startWrongQuiz(specificId = null) {
        let wrongIds = Object.keys(this.user.wrong);
        if (wrongIds.length === 0) {
            this.toast('没有错题', 'warning');
            return;
        }

        if (specificId) {
            wrongIds = [specificId];
        }

        const questions = wrongIds.map(id => {
            const q = this.data.questions.find(q => q.id === parseInt(id));
            return q;
        }).filter(q => q);

        if (questions.length === 0) {
            this.toast('错题不存在', 'warning');
            return;
        }

        this.state.wrongQuiz = {
            title: '错题重做',
            questions,
        };
        this.state.wrongAnswers = {};

        this.showPage('wrong-quiz');
        this.renderWrongQuiz();
    },

    renderWrongQuiz() {
        const quiz = this.state.wrongQuiz;
        if (!quiz) return;

        const container = document.getElementById('wrongQuestionsList');
        if (!container) return;

        document.getElementById('wrongQuizTitle').textContent = quiz.title;

        const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };
        const letters = ['A', 'B', 'C', 'D'];

        let html = '';
        quiz.questions.forEach((question, index) => {
            const chapter = this.data.chapters.find(c => c.id === question.chapter);
            const isAnswered = this.state.wrongAnswers[question.id] !== undefined;

            html += `
                <div class="exam-question-item ${isAnswered ? 'answered' : ''}" id="wrong-q-${question.id}" data-index="${index}">
                    <div class="exam-question-header">
                        <span class="exam-question-number">${index + 1}</span>
                        <span class="exam-question-type">${typeMap[question.type] || question.type}</span>
                        ${chapter ? `<span class="exam-question-chapter">${chapter.name}</span>` : ''}
                    </div>
                    <div class="exam-question-text">${question.question}</div>
                    <div class="exam-options-list">
            `;

            if (question.type === 'single') {
                question.options.forEach((opt, i) => {
                    const isSelected = this.state.wrongAnswers[question.id] === i;
                    html += `
                        <div class="exam-option-item ${isSelected ? 'selected' : ''}" data-question-id="${question.id}" data-index="${i}" onclick="App.selectWrongOption(${question.id}, ${i})">
                            <span class="exam-option-letter">${letters[i]}</span>
                            <span class="exam-option-text">${opt}</span>
                        </div>
                    `;
                });
            } else if (question.type === 'judge') {
                const isSelectedTrue = this.state.wrongAnswers[question.id] === 0;
                const isSelectedFalse = this.state.wrongAnswers[question.id] === 1;
                html += `
                    <div class="exam-option-item ${isSelectedTrue ? 'selected' : ''}" data-question-id="${question.id}" data-index="0" onclick="App.selectWrongOption(${question.id}, 0)">
                        <span class="exam-option-letter">A</span>
                        <span class="exam-option-text">正确</span>
                    </div>
                    <div class="exam-option-item ${isSelectedFalse ? 'selected' : ''}" data-question-id="${question.id}" data-index="1" onclick="App.selectWrongOption(${question.id}, 1)">
                        <span class="exam-option-letter">B</span>
                        <span class="exam-option-text">错误</span>
                    </div>
                `;
            } else {
                const answer = this.state.wrongAnswers[question.id] || '';
                html += `
                    <textarea class="exam-short-answer" data-question-id="${question.id}" placeholder="请输入答案..." oninput="App.saveWrongShortAnswer(${question.id}, this.value)">${answer}</textarea>
                `;
            }

            html += `</div></div>`;
        });

        container.innerHTML = html;
        this.renderWrongAnswerCard();
    },

    selectWrongOption(questionId, optionIndex) {
        this.state.wrongAnswers[questionId] = optionIndex;
        const questionItem = document.querySelector(`#wrong-q-${questionId}`);
        if (questionItem) {
            const options = questionItem.querySelectorAll('.exam-option-item');
            options.forEach((opt, i) => {
                opt.classList.toggle('selected', i === optionIndex);
            });
            questionItem.classList.add('answered');
        }
        this.renderWrongAnswerCard();
    },

    saveWrongShortAnswer(questionId, value) {
        this.state.wrongAnswers[questionId] = value;
        const questionItem = document.querySelector(`#wrong-q-${questionId}`);
        if (questionItem) {
            if (value.trim()) {
                questionItem.classList.add('answered');
            } else {
                questionItem.classList.remove('answered');
            }
        }
        this.renderWrongAnswerCard();
    },

    renderWrongAnswerCard() {
        const quiz = this.state.wrongQuiz;
        if (!quiz) return;

        const container = document.getElementById('wrongAnswerCardTypes');
        if (!container) return;

        const typeGroups = {};
        quiz.questions.forEach((q, index) => {
            if (!typeGroups[q.type]) typeGroups[q.type] = [];
            typeGroups[q.type].push({ ...q, index });
        });

        const typeNames = { single: '单选题', judge: '判断题', short: '简答题' };
        let html = '';

        Object.keys(typeGroups).forEach(type => {
            const questions = typeGroups[type];
            html += `
                <div class="answer-card-type-group">
                    <div class="answer-card-type-label">${typeNames[type]} (${questions.length}题)</div>
                    <div class="answer-card-grid">
            `;

            questions.forEach(q => {
                const isAnswered = this.state.wrongAnswers[q.id] !== undefined;
                html += `
                    <button class="answer-card-btn ${isAnswered ? 'answered' : ''}" data-question-id="${q.id}" onclick="App.scrollToWrongQuestion(${q.id})">
                        ${q.index + 1}
                    </button>
                `;
            });

            html += `</div></div>`;
        });

        container.innerHTML = html;

        const total = quiz.questions.length;
        const answered = Object.keys(this.state.wrongAnswers).length;
        const unanswered = total - answered;

        const answeredEl = document.getElementById('wrongAnsweredCount');
        const unansweredEl = document.getElementById('wrongUnansweredCount');

        if (answeredEl) answeredEl.textContent = answered;
        if (unansweredEl) unansweredEl.textContent = unanswered;
    },

    scrollToWrongQuestion(questionId) {
        const questionEl = document.getElementById(`wrong-q-${questionId}`);
        if (questionEl) {
            questionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.querySelectorAll('#wrongQuestionsList .exam-question-item').forEach(item => {
                item.classList.remove('current');
            });
            questionEl.classList.add('current');
        }
    },

    submitWrongQuiz() {
        const quiz = this.state.wrongQuiz;
        if (!quiz) return;

        const total = quiz.questions.length;
        const answered = Object.keys(this.state.wrongAnswers).length;

        if (answered < total) {
            const unanswered = total - answered;
            if (!confirm(`还有 ${unanswered} 道题未作答，确定要提交吗？`)) {
                return;
            }
        }

        let correct = 0;
        const results = [];

        quiz.questions.forEach((question, index) => {
            const userAnswer = this.state.wrongAnswers[question.id];
            let isCorrect = false;
            let userAnswerText = '';
            let correctAnswerText = '';

            if (question.type === 'single') {
                const letters = ['A', 'B', 'C', 'D'];
                isCorrect = userAnswer !== undefined && letters[userAnswer] === question.answer;
                userAnswerText = userAnswer !== undefined ? `${letters[userAnswer]}. ${question.options[userAnswer]}` : '未作答';
                correctAnswerText = `${question.answer}. ${question.options[letters.indexOf(question.answer)]}`;
            } else if (question.type === 'judge') {
                const selectedText = userAnswer === 0 ? '正确' : (userAnswer === 1 ? '错误' : '');
                isCorrect = selectedText === question.answer;
                userAnswerText = selectedText || '未作答';
                correctAnswerText = question.answer;
            } else {
                isCorrect = true;
                userAnswerText = userAnswer || '未作答';
                correctAnswerText = this.parseMarkdownImage(question.answer);
            }

            if (isCorrect) {
                correct++;
                delete this.user.wrong[question.id];
            }

            this.user.answered[question.id] = {
                correct: isCorrect,
                answer: userAnswer,
                timestamp: Date.now(),
            };

            results.push({ question, userAnswer, isCorrect, userAnswerText, correctAnswerText, index });
        });

        const accuracy = Math.round((correct / total) * 100);

        this.saveUserProgress();
        this.updateSidebarStats();

        this.showWrongResultPage({ total, correct, accuracy }, results);
    },

    showWrongResultPage(result, results) {
        this.showPage('wrong-result');

        const summaryEl = document.getElementById('wrongResultSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="exam-result-score ${result.accuracy >= 60 ? 'pass' : 'fail'}">
                    ${result.accuracy}%
                </div>
                <div class="exam-result-label">${result.accuracy >= 60 ? '恭喜通过！' : '继续努力！'}</div>
                <div class="exam-result-stats">
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value">${result.total}</div>
                        <div class="exam-result-stat-label">总题数</div>
                    </div>
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value" style="color: var(--success);">${result.correct}</div>
                        <div class="exam-result-stat-label">正确</div>
                    </div>
                    <div class="exam-result-stat">
                        <div class="exam-result-stat-value" style="color: var(--danger);">${result.total - result.correct}</div>
                        <div class="exam-result-stat-label">错误</div>
                    </div>
                </div>
            `;
        }

        const detailEl = document.getElementById('wrongResultDetail');
        if (detailEl) {
            let html = '';
            results.forEach(r => {
                const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };
                html += `
                    <div class="exam-result-item ${r.isCorrect ? 'correct' : 'wrong'}">
                        <div class="exam-result-item-header">
                            <span class="exam-question-number">${r.index + 1}</span>
                            <span class="exam-question-type">${typeMap[r.question.type]}</span>
                            <span class="exam-result-item-status ${r.isCorrect ? 'correct' : 'wrong'}">
                                ${r.isCorrect ? '✓ 正确' : '✗ 错误'}
                            </span>
                        </div>
                        <div class="exam-result-item-question">${r.question.question}</div>
                        <div class="exam-result-item-answers">
                            <div class="exam-result-item-answer">
                                <span class="exam-result-item-answer-label">你的答案：</span>
                                <span class="exam-result-item-answer-value ${r.isCorrect ? '' : 'user-wrong'}">${r.userAnswerText}</span>
                            </div>
                            ${!r.isCorrect ? `
                            <div class="exam-result-item-answer">
                                <span class="exam-result-item-answer-label">正确答案：</span>
                                <span class="exam-result-item-answer-value correct">${r.correctAnswerText}</span>
                            </div>
                            ` : ''}
                            ${r.question.explanation ? `
                            <div class="exam-result-item-answer">
                                <span class="exam-result-item-answer-label">解析：</span>
                                <span class="exam-result-item-answer-value">${r.question.explanation}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            detailEl.innerHTML = html;
        }
    },

    renderFavorites() {
        const container = document.getElementById('favoritesList');
        if (!container) return;

        const favoriteIds = Array.from(this.user.favorites);
        if (favoriteIds.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无收藏题目</div>';
            return;
        }

        let html = '';
        favoriteIds.forEach(id => {
            const question = this.data.questions.find(q => q.id === id);
            if (!question) return;

            const chapter = this.data.chapters.find(c => c.id === question.chapter);
            const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };

            html += `
                <div class="favorite-item">
                    <div class="favorite-item-header">
                        <span class="favorite-item-type">${typeMap[question.type]}</span>
                        ${chapter ? `<span class="favorite-item-chapter">${chapter.name}</span>` : ''}
                        <button class="favorite-item-remove" onclick="App.removeFavorite(${id})">取消收藏</button>
                    </div>
                    <div class="favorite-item-question">${question.question}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    removeFavorite(questionId) {
        this.user.favorites.delete(questionId);
        this.saveUserProgress();
        this.renderFavorites();
        this.toast('已取消收藏', 'success');
    },

    renderStats() {
        const container = document.getElementById('statsOverview');
        if (!container) return;

        const total = this.data.questions.length;
        const practiced = Object.keys(this.user.answered).length;
        const correct = Object.values(this.user.answered).filter(a => a.correct).length;
        const wrong = Object.keys(this.user.wrong).length;
        const accuracy = practiced > 0 ? Math.round((correct / practiced) * 100) : 0;

        container.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">总题数</span>
                <span class="stat-value">${total}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">已练习</span>
                <span class="stat-value">${practiced}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">正确率</span>
                <span class="stat-value">${accuracy}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">错题数</span>
                <span class="stat-value">${wrong}</span>
            </div>
        `;

        // 渲染各章正确率
        this.renderChapterChart();
    },

    renderChapterChart() {
        const container = document.getElementById('chapterChart');
        if (!container) return;

        const chapters = this.data.chapters;
        if (!chapters || chapters.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无章节数据</div>';
            return;
        }

        let html = '<div class="chapter-chart-list">';
        chapters.forEach(chapter => {
            const chapterQuestions = this.data.questions.filter(q => q.chapter === chapter.id);
            const chapterAnswered = chapterQuestions.filter(q => this.user.answered[q.id]);
            const chapterCorrect = chapterAnswered.filter(q => this.user.answered[q.id]?.correct);
            const accuracy = chapterAnswered.length > 0 ? Math.round((chapterCorrect.length / chapterAnswered.length) * 100) : 0;

            html += `
                <div class="chapter-chart-item">
                    <div class="chapter-chart-header">
                        <span class="chapter-chart-name">${chapter.icon} ${chapter.name}</span>
                        <span class="chapter-chart-accuracy">${accuracy}%</span>
                    </div>
                    <div class="chapter-chart-bar">
                        <div class="chapter-chart-bar-fill" style="width: ${accuracy}%"></div>
                    </div>
                    <div class="chapter-chart-stats">
                        <span>已练习: ${chapterAnswered.length}/${chapterQuestions.length}</span>
                        <span>正确: ${chapterCorrect.length}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    },

    renderExamHistory() {
        const container = document.getElementById('examHistory');
        if (!container) return;

        if (this.state.examHistory.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无考试记录</div>';
            return;
        }

        let html = '';
        this.state.examHistory.forEach(record => {
            html += `
                <div class="history-item">
                    <div class="history-item-date">${record.date}</div>
                    <div class="history-item-stats">
                        <span>正确率: ${record.accuracy}%</span>
                        <span>用时: ${record.time}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    updateSidebarStats() {
        const total = this.data.questions.length;
        const validIds = new Set(this.data.questions.map(q => q.id));
        const practiced = Object.keys(this.user.answered).filter(id => validIds.has(Number(id) || id)).length;
        const correct = Object.values(this.user.answered).filter(a => a.correct).length;
        const accuracy = practiced > 0 ? Math.round((correct / practiced) * 100) : 0;

        document.getElementById('totalQuestions').textContent = total;
        document.getElementById('practicedQuestions').textContent = practiced;
        document.getElementById('accuracyRate').textContent = accuracy + '%';
    },

    initTheme() {
        const savedTheme = localStorage.getItem('quiz_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('quiz_theme', newTheme);
    },

    resetProgress() {
        if (confirm('确定要重置所有进度吗？此操作不可恢复。')) {
            localStorage.removeItem('quiz_progress');
            this.user.answered = {};
            this.user.wrong = {};
            this.user.favorites = new Set();
            this.user.history = [];
            this.state.examHistory = [];
            this.updateSidebarStats();
            this.renderHome();
            this.renderChapters();
            this.toast('进度已重置', 'success');
        }
    },

    handleSearch(keyword) {
        const container = document.getElementById('searchResults');
        const desc = document.getElementById('searchDesc');

        if (!keyword.trim()) {
            container.innerHTML = '<div class="empty-state">输入关键词开始搜索</div>';
            desc.textContent = '共找到 0 个结果';
            return;
        }

        const results = this.data.questions.filter(q =>
            q.question.toLowerCase().includes(keyword.toLowerCase()) ||
            (q.explanation && q.explanation.toLowerCase().includes(keyword.toLowerCase()))
        );

        desc.textContent = `共找到 ${results.length} 个结果`;

        if (results.length === 0) {
            container.innerHTML = '<div class="empty-state">未找到相关题目</div>';
            return;
        }

        let html = '';
        results.forEach(question => {
            const chapter = this.data.chapters.find(c => c.id === question.chapter);
            const typeMap = { single: '单选题', judge: '判断题', short: '简答题' };

            html += `
                <div class="search-result-item">
                    <div class="search-result-header">
                        <span class="search-result-type">${typeMap[question.type]}</span>
                        ${chapter ? `<span class="search-result-chapter">${chapter.name}</span>` : ''}
                    </div>
                    <div class="search-result-question">${question.question}</div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.showPage('search');
    },

    toast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    closeModal(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
    },

    repracticeExamWrong() {
        this.startWrongQuiz();
    },

    toggleCurrentFavorite() {
        const quiz = this.state.currentQuiz;
        if (!quiz || !quiz.questions[this.state.currentQuestionIndex]) return;

        const question = quiz.questions[this.state.currentQuestionIndex];
        const btnFavorite = document.getElementById('btnFavorite');

        if (this.user.favorites.has(question.id)) {
            this.user.favorites.delete(question.id);
            if (btnFavorite) btnFavorite.textContent = '☆ 收藏';
            this.toast('已取消收藏', 'success');
        } else {
            this.user.favorites.add(question.id);
            if (btnFavorite) btnFavorite.textContent = '★ 已收藏';
            this.toast('已收藏', 'success');
        }
        this.saveUserProgress();
    },

    repracticeFavorites() {
        const favoriteIds = Array.from(this.user.favorites);
        if (favoriteIds.length === 0) {
            this.toast('没有收藏的题目', 'warning');
            return;
        }

        const questions = favoriteIds.map(id => {
            return this.data.questions.find(q => q.id === id);
        }).filter(q => q);

        if (questions.length === 0) {
            this.toast('收藏的题目不存在', 'warning');
            return;
        }

        this.state.currentQuiz = {
            type: 'favorites',
            title: '收藏题目练习',
            questions,
        };
        this.state.currentQuestionIndex = 0;
        this.state.selectedAnswer = null;
        this.state.isAnswered = false;

        this.showPage('quiz');
        this.showSingleQuizMode();
        this.renderQuestion();
    },
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
